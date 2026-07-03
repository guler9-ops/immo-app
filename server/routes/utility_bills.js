const express = require('express');
const router = express.Router();
const db = require('../database');

// Hilfsfunktion: Verteilung berechnen
function calculateDistribution(units, costs, distributionKey) {
  if (!units.length || !costs.length) return [];

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

  // Basis für den gewählten Schlüssel
  let denominatorFn;
  let shareFn;
  if (distributionKey === 'units') {
    const activeUnits = units.filter(u => u.tenant_name); // nur belegte Einheiten
    const count = activeUnits.length || units.length;
    denominatorFn = () => count;
    shareFn = (u) => 1 / denominatorFn();
  } else if (distributionKey === 'persons') {
    const totalPersons = units.reduce((s, u) => s + (u.persons_count || 1), 0);
    denominatorFn = () => totalPersons;
    shareFn = (u) => (u.persons_count || 1) / denominatorFn();
  } else {
    // Standard: Wohnfläche m²
    const totalSqm = units.reduce((s, u) => s + (u.size_sqm || 0), 0);
    denominatorFn = () => totalSqm || 1;
    shareFn = (u) => (u.size_sqm || 0) / denominatorFn();
  }

  // Kosten nach Kategorie gruppieren
  const byCategory = {};
  costs.forEach(c => {
    const cat = c.category;
    if (!byCategory[cat]) byCategory[cat] = { label: c.category, total: 0, items: [] };
    byCategory[cat].total += c.amount;
    byCategory[cat].items.push(c);
  });

  return units.map(u => {
    const share = shareFn(u);
    const unitCosts = totalCosts * share;

    // Vorauszahlungen (Nebenkosten-Anteil aus Mietvertrag × 12 Monate)
    const prepaid = (u.rent_utilities || 0) * 12;
    const diff = prepaid - unitCosts;

    // Aufschlüsselung pro Kategorie
    const breakdown = Object.entries(byCategory).map(([cat, { label, total }]) => ({
      category: cat,
      label,
      total,
      unitAmount: total * share,
    }));

    return {
      unit_id: u.id,
      unit_name: u.name,
      tenant_name: u.tenant_name || null,
      size_sqm: u.size_sqm,
      persons_count: u.persons_count || 1,
      share: Math.round(share * 10000) / 100, // in %
      unit_costs: Math.round(unitCosts * 100) / 100,
      prepaid: Math.round(prepaid * 100) / 100,
      diff: Math.round(diff * 100) / 100, // positiv = Guthaben, negativ = Nachzahlung
      breakdown,
    };
  });
}

// Alle Abrechnungen
router.get('/', (req, res) => {
  const bills = db.prepare(`
    SELECT ub.*, p.name as property_name
    FROM utility_bills ub
    JOIN properties p ON p.id = ub.property_id
    ORDER BY ub.year DESC, ub.created_at DESC
  `).all();
  res.json(bills);
});

// Einzelne Abrechnung mit Kostenimport + Verteilung
router.get('/:id', (req, res) => {
  const bill = db.prepare(`
    SELECT ub.*, p.name as property_name, p.distribution_key
    FROM utility_bills ub
    JOIN properties p ON p.id = ub.property_id
    WHERE ub.id = ?
  `).get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Nicht gefunden' });

  // Einheiten des Objekts (nur mit aktivem Mietvertrag für Vorauszahlung)
  const units = db.prepare(`
    SELECT u.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      l.rent_utilities
    FROM units u
    LEFT JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
    LEFT JOIN tenants t ON t.id = l.tenant_id
    WHERE u.property_id = ?
    ORDER BY u.name
  `).all(bill.property_id);

  // Umlagefähige Kosten für diesen Zeitraum + dieses Objekt aus dem Kosten-Modul
  const costs = db.prepare(`
    SELECT * FROM costs
    WHERE (property_id = ? OR property_id IS NULL)
      AND allocatable = 1
      AND date >= ? AND date <= ?
    ORDER BY date DESC
  `).all(bill.property_id, bill.period_from, bill.period_to);

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const distribution = calculateDistribution(units, costs, bill.distribution_key || 'sqm');

  res.json({ ...bill, units, costs, totalCosts, distribution });
});

// Vorschau: Kosten + Verteilung für Objekt+Zeitraum (vor dem Speichern)
router.post('/preview', (req, res) => {
  const { property_id, period_from, period_to } = req.body;
  if (!property_id || !period_from || !period_to) {
    return res.status(400).json({ error: 'property_id, period_from und period_to erforderlich' });
  }

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(property_id);
  if (!property) return res.status(404).json({ error: 'Objekt nicht gefunden' });

  const units = db.prepare(`
    SELECT u.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      l.rent_utilities
    FROM units u
    LEFT JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
    LEFT JOIN tenants t ON t.id = l.tenant_id
    WHERE u.property_id = ?
    ORDER BY u.name
  `).all(property_id);

  const costs = db.prepare(`
    SELECT * FROM costs
    WHERE (property_id = ? OR property_id IS NULL)
      AND allocatable = 1
      AND date >= ? AND date <= ?
    ORDER BY category, date DESC
  `).all(property_id, period_from, period_to);

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const distribution = calculateDistribution(units, costs, property.distribution_key || 'sqm');

  res.json({
    property,
    units,
    costs,
    totalCosts,
    distribution,
    distribution_key: property.distribution_key || 'sqm',
  });
});

// Abrechnung erstellen
router.post('/', (req, res) => {
  const { property_id, year, period_from, period_to, status, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO utility_bills (property_id, year, period_from, period_to, status, notes,
      total_heating, total_water, total_maintenance, total_insurance, total_other)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0)
  `).run(property_id, year, period_from, period_to, status || 'draft', notes || '');
  const created = db.prepare('SELECT * FROM utility_bills WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Abrechnung aktualisieren
router.put('/:id', (req, res) => {
  const { property_id, year, period_from, period_to, status, notes } = req.body;
  db.prepare(`
    UPDATE utility_bills SET property_id=?, year=?, period_from=?, period_to=?, status=?, notes=?
    WHERE id=?
  `).run(property_id, year, period_from, period_to, status, notes, req.params.id);
  const updated = db.prepare('SELECT * FROM utility_bills WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Abrechnung löschen
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM utility_bills WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
