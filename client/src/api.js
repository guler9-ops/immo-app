const BASE = '/api';

function getToken() {
  return localStorage.getItem('immo_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Fehler' }));
    throw new Error(err.error || 'Server-Fehler');
  }
  return res.json();
}

export const api = {
  // Dashboard
  dashboard: () => request('/dashboard'),

  // Objekte
  getProperties: () => request('/properties'),
  getProperty: (id) => request(`/properties/${id}`),
  createProperty: (data) => request('/properties', { method: 'POST', body: JSON.stringify(data) }),
  updateProperty: (id, data) => request(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProperty: (id) => request(`/properties/${id}`, { method: 'DELETE' }),

  // Einheiten
  getUnits: (propertyId) => request('/units' + (propertyId ? `?property_id=${propertyId}` : '')),
  createUnit: (data) => request('/units', { method: 'POST', body: JSON.stringify(data) }),
  updateUnit: (id, data) => request(`/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUnit: (id) => request(`/units/${id}`, { method: 'DELETE' }),

  // Mieter
  getTenants: () => request('/tenants'),
  getTenant: (id) => request(`/tenants/${id}`),
  createTenant: (data) => request('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id, data) => request(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTenant: (id) => request(`/tenants/${id}`, { method: 'DELETE' }),

  // Mietverträge
  getLeases: () => request('/leases'),
  getLease: (id) => request(`/leases/${id}`),
  createLease: (data) => request('/leases', { method: 'POST', body: JSON.stringify(data) }),
  updateLease: (id, data) => request(`/leases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLease: (id) => request(`/leases/${id}`, { method: 'DELETE' }),

  // Zahlungen
  getPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('/payments' + (q ? '?' + q : ''));
  },
  getPaymentSummary: () => request('/payments/summary'),
  createPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id) => request(`/payments/${id}`, { method: 'DELETE' }),

  // Zählerstände
  getMeterReadings: (unitId) => request('/meter-readings' + (unitId ? `?unit_id=${unitId}` : '')),
  getLatestMeterReadings: () => request('/meter-readings/latest'),
  createMeterReading: (data) => request('/meter-readings', { method: 'POST', body: JSON.stringify(data) }),
  deleteMeterReading: (id) => request(`/meter-readings/${id}`, { method: 'DELETE' }),

  // Dokumente
  getDocuments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('/documents' + (q ? '?' + q : ''));
  },
  uploadDocument: (formData) => fetch(BASE + '/documents/upload', { method: 'POST', body: formData }).then(r => r.json()),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Nebenkosten
  getUtilityBills: () => request('/utility-bills'),
  getUtilityBill: (id) => request(`/utility-bills/${id}`),
  previewUtilityBill: (data) => request('/utility-bills/preview', { method: 'POST', body: JSON.stringify(data) }),
  createUtilityBill: (data) => request('/utility-bills', { method: 'POST', body: JSON.stringify(data) }),
  updateUtilityBill: (id, data) => request(`/utility-bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUtilityBill: (id) => request(`/utility-bills/${id}`, { method: 'DELETE' }),

  // Nachrichten
  getMessages: () => request('/messages'),
  createMessage: (data) => request('/messages', { method: 'POST', body: JSON.stringify(data) }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: 'DELETE' }),

  // Eigentümer
  getOwners: () => request('/owners'),
  createOwner: (data) => request('/owners', { method: 'POST', body: JSON.stringify(data) }),
  updateOwner: (id, data) => request(`/owners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOwner: (id) => request(`/owners/${id}`, { method: 'DELETE' }),

  // Kredite
  getKredite: () => request('/kredite'),
  createKredit: (data) => request('/kredite', { method: 'POST', body: JSON.stringify(data) }),
  updateKredit: (id, data) => request(`/kredite/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKredit: (id) => request(`/kredite/${id}`, { method: 'DELETE' }),

  // Kosten
  getCosts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('/costs' + (q ? '?' + q : ''));
  },
  createCost: (data) => request('/costs', { method: 'POST', body: JSON.stringify(data) }),
  updateCost: (id, data) => request(`/costs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCost: (id) => request(`/costs/${id}`, { method: 'DELETE' }),
};
