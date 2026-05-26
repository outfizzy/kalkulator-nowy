const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulate() {
  // 1. Fetch data
  const { data: contracts, error: errC } = await supabase.from('contracts').select('*');
  const { data: installations, error: errI } = await supabase.from('installations').select('*');

  if (errC || errI) {
    console.error("Error fetching data:", errC, errI);
    return;
  }

  console.log(`Fetched ${contracts.length} contracts and ${installations.length} installations.`);

  // 2. Mock geoCoords Map (since geocoding runs in the background and might fail/succeed)
  // Let's check what would happen if geocoding returns coordinates for them.
  // Wait, let's see how they are mapped in the client:
  const items = [];
  const realizationContractIds = new Set();
  const installationOfferIds = new Set();

  // Map installations
  installations.forEach(inst => {
    // mock geoCoords returning coordinates
    const geo = { lat: 51.5, lng: 11.5 }; // mock central germany
    installationOfferIds.add(inst.offer_id || '');

    items.push({
      id: `i-${inst.id}`,
      lat: geo.lat,
      lng: geo.lng,
      title: inst.installation_data?.productSummary || 'Realizacja',
      city: inst.installation_data?.client?.city || null,
      address: inst.installation_data?.client?.address || null,
      postal_code: inst.installation_data?.client?.postalCode || null,
      client_name: `${inst.installation_data?.client?.firstName || ''} ${inst.installation_data?.client?.lastName || ''}`.trim(),
      contract_number: inst.installation_data?.contractNumber || null,
      source: 'installation',
    });
  });

  // Map contracts
  contracts.forEach(contract => {
    if (installationOfferIds.has(contract.offer_id)) return;
    const client = contract.contract_data?.client;
    if (!client) return;

    const geo = { lat: 51.5, lng: 11.5 }; // mock central germany
    const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.company || '';
    
    // We check contract.product format:
    const product = contract.contract_data?.product;
    const productDesc = product
        ? (typeof product === 'string' ? product : `${product.modelId || ''} ${product.width || ''}x${product.projection || ''}`)
        : 'Umowa';

    items.push({
      id: `c-${contract.id}`,
      lat: geo.lat,
      lng: geo.lng,
      title: productDesc,
      city: client.city || client.postal_code || null,
      address: client.address || client.street || null,
      postal_code: client.postalCode || client.postal_code || null,
      client_name: clientName,
      contract_number: contract.contract_data?.contractNumber || null,
      source: 'contract',
    });
  });

  console.log(`Mapped ${items.length} items total.`);
  console.log("Sample mapped item (first contract):");
  const contractItem = items.find(i => i.source === 'contract');
  console.log(JSON.stringify(contractItem, null, 2));

  console.log("Sample mapped item (first installation):");
  const instItem = items.find(i => i.source === 'installation');
  console.log(JSON.stringify(instItem, null, 2));
}

simulate();
