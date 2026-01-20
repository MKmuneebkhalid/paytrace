const PAYTRACE_API_URL = process.env.PAYTRACE_API_URL || 'https://api.sandbox.paytrace.com';
const PAYTRACE_USERNAME = process.env.PAYTRACE_USERNAME;
const PAYTRACE_PASSWORD = process.env.PAYTRACE_PASSWORD;
const PAYTRACE_INTEGRATOR_ID = process.env.PAYTRACE_INTEGRATOR_ID;

let cachedToken = null;
let tokenExpiry = null;

export async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${PAYTRACE_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: PAYTRACE_USERNAME,
      password: PAYTRACE_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayTrace OAuth failed: ${error}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  
  return cachedToken;
}

export async function getProtectClientKey() {
  const token = await getAccessToken();
  
  const payload = {};
  if (PAYTRACE_INTEGRATOR_ID) {
    payload.integrator_id = PAYTRACE_INTEGRATOR_ID;
  }

  const response = await fetch(`${PAYTRACE_API_URL}/v1/payment_fields/token/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Protect client key: ${error}`);
  }

  const data = await response.json();
  return data.clientKey;
}

export async function createCustomerProfile({ customerId, cardNumber, expirationMonth, expirationYear, cvv, billingAddress }) {
  const token = await getAccessToken();
  
  const payload = {
    customer_id: customerId,
    credit_card: {
      number: cardNumber,
      expiration_month: expirationMonth,
      expiration_year: expirationYear,
    },
  };

  if (cvv) {
    payload.csc = cvv;
  }

  if (PAYTRACE_INTEGRATOR_ID) {
    payload.integrator_id = PAYTRACE_INTEGRATOR_ID;
  }

  if (billingAddress) {
    payload.billing_address = billingAddress;
  }

  const response = await fetch(`${PAYTRACE_API_URL}/v1/customer/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    const errorDetails = data.errors ? JSON.stringify(data.errors) : data.status_message;
    throw new Error(errorDetails || 'Failed to create customer profile');
  }

  return {
    success: true,
    customerId: data.customer_id,
    maskedCardNumber: data.masked_card_number,
  };
}

export async function updateCustomerProfile({ customerId, hpfToken, encKey, expirationMonth, expirationYear, billingAddress }) {
  const token = await getAccessToken();
  
  const payload = {
    customer_id: customerId,
  };

  if (PAYTRACE_INTEGRATOR_ID) {
    payload.integrator_id = PAYTRACE_INTEGRATOR_ID;
  }

  if (hpfToken && encKey) {
    payload.credit_card = {
      hpf_token: hpfToken,
      enc_key: encKey,
      expiration_month: expirationMonth,
      expiration_year: expirationYear,
    };
  }

  if (billingAddress) {
    payload.billing_address = billingAddress;
  }

  const response = await fetch(`${PAYTRACE_API_URL}/v1/customer/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.status_message || 'Failed to update customer profile');
  }

  return {
    success: true,
    customerId: data.customer_id,
    maskedCardNumber: data.masked_card_number,
  };
}

export async function getCustomerProfile(customerId) {
  const token = await getAccessToken();
  
  const payload = { customer_id: customerId };
  if (PAYTRACE_INTEGRATOR_ID) {
    payload.integrator_id = PAYTRACE_INTEGRATOR_ID;
  }

  const response = await fetch(`${PAYTRACE_API_URL}/v1/customer/export`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.status_message || 'Customer not found');
  }

  return data.customers?.[0] || null;
}

export async function deleteCustomerProfile(customerId) {
  const token = await getAccessToken();
  
  const payload = { customer_id: customerId };
  if (PAYTRACE_INTEGRATOR_ID) {
    payload.integrator_id = PAYTRACE_INTEGRATOR_ID;
  }

  const response = await fetch(`${PAYTRACE_API_URL}/v1/customer/delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.status_message || 'Failed to delete customer profile');
  }

  return { success: true };
}
