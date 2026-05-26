const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We use service role key if available, otherwise anon key but wait,
// service role is not in env.local. But wait, we can execute the script using the anon key?
// Ah! If we use anon key, we will get 0 rows because of RLS.
// But wait! We can bypass RLS in the database or we can fetch the rows using the Supabase admin client,
// or we can fetch them via a quick SQL query using the execute_sql tool!
// Yes! Let's write the script to read a JSON file, or we can just fetch the data from the DB using a service key?
// Wait, we don't have the service key in env.local. But we can run execute_sql via MCP to fetch the rows,
// save them to a JSON file in scratch, and then run our script on that JSON file!
// That is extremely clever and uses our tools perfectly.

const fs = require('fs');

async function test() {
  const contracts = JSON.parse(fs.readFileSync('scratch/contracts.json', 'utf8'));
  const installations = JSON.parse(fs.readFileSync('scratch/installations.json', 'utf8'));
  const realizations = []; // realizations is empty

  // Let's copy the mapping logic from PortfolioDashboard.tsx

  // 1. Build geocodable items
  const allGeoItems = [];
  realizations.forEach(r => {
    allGeoItems.push({
      id: `r-${r.id}`,
      address: r.address || undefined,
      city: r.city || undefined,
      postalCode: r.postal_code || undefined,
      lat: r.latitude || undefined,
      lng: r.longitude || undefined
    });
  });

  installations.forEach(inst => {
    // Wait, let's see how inst.client is structured in database raw:
    // It's in inst.installation_data.client!
    // But in getInstallations(), it is mapped to inst.client directly!
    // Let's map installations first:
    const installationData = inst.installation_data || {};
    const clientData = installationData.client || {};
    const client = {
        firstName: clientData.firstName || '',
        lastName: clientData.lastName || '',
        city: clientData.city || '',
        address: clientData.address || '',
        postalCode: clientData.postalCode || undefined,
        phone: clientData.phone || '',
        email: clientData.email || '',
        coordinates: clientData.coordinates
    };

    // Let's create the mapped installation object
    const mappedInst = {
        id: inst.id,
        offerId: inst.offer_id,
        client,
        contractNumber: installationData.contractNumber,
        productSummary: installationData.productSummary || '',
        status: inst.status,
        scheduledDate: inst.scheduled_date,
        teamId: installationData.teamId || inst.team_id,
        notes: installationData.notes,
        createdAt: new Date(inst.created_at)
    };

    allGeoItems.push({
      id: `i-${mappedInst.id}`,
      address: mappedInst.client?.address,
      city: mappedInst.client?.city,
      postalCode: mappedInst.client?.postalCode,
      lat: mappedInst.client?.coordinates?.lat || mappedInst.client?.lat,
      lng: mappedInst.client?.coordinates?.lng || mappedInst.client?.lng
    });
  });

  contracts.forEach(c => {
    // contract in getContracts() is mapped:
    const mappedContract = {
      id: c.id,
      offerId: c.offer_id,
      contractNumber: c.contract_data?.contractNumber,
      status: c.status,
      client: c.contract_data?.client,
      product: c.contract_data?.product,
      createdAt: new Date(c.created_at)
    };

    const client = mappedContract.client;
    if (!client) return;
    allGeoItems.push({
      id: `c-${mappedContract.id}`,
      address: client.address || client.street,
      city: client.city,
      postalCode: client.postalCode || client.zip || client.postal_code,
      lat: client.coordinates?.lat || client.lat,
      lng: client.coordinates?.lng || client.lng
    });
  });

  console.log(`allGeoItems length: ${allGeoItems.length}`);
  console.log("Sample geo item:", allGeoItems[0]);

  // Let's mock geoCoords map
  const geoCoords = new Map();
  // Assume all items geocode to Berlin for testing
  allGeoItems.forEach(item => {
    geoCoords.set(item.id, { lat: 52.52, lng: 13.40 });
  });

  // Now, merge all data sources into MapItem[]
  const items = [];

  // Installations
  const realizationContractIds = new Set();
  const installationOfferIds = new Set();

  installations.forEach(inst => {
    // Map as mapped by InstallationService
    const installationData = inst.installation_data || {};
    const clientData = installationData.client || {};
    const client = {
        firstName: clientData.firstName || '',
        lastName: clientData.lastName || '',
        city: clientData.city || '',
        address: clientData.address || '',
        postalCode: clientData.postalCode || undefined,
        phone: clientData.phone || '',
        email: clientData.email || '',
        coordinates: clientData.coordinates
    };
    const mappedInst = {
        id: inst.id,
        offerId: inst.offer_id,
        client,
        contractNumber: installationData.contractNumber,
        productSummary: installationData.productSummary || '',
        status: inst.status,
        scheduledDate: inst.scheduled_date,
        teamId: installationData.teamId || inst.team_id,
        notes: installationData.notes,
        createdAt: new Date(inst.created_at)
    };

    if (realizationContractIds.has(mappedInst.contractId)) return;
    const geo = geoCoords.get(`i-${mappedInst.id}`);
    if (!geo) return;

    installationOfferIds.add(mappedInst.offerId || '');

    items.push({
        id: `i-${mappedInst.id}`,
        lat: geo.lat,
        lng: geo.lng,
        title: mappedInst.productSummary || 'Realizacja',
        description: null,
        product_type: 'Terrassenüberdachung',
        city: mappedInst.client.city,
        address: mappedInst.client.address,
        postal_code: mappedInst.client.postalCode,
        client_name: `${mappedInst.client.firstName || ''} ${mappedInst.client.lastName || ''}`.trim(),
        client_phone: mappedInst.client.phone || null,
        client_email: mappedInst.client.email || null,
        contract_number: mappedInst.contractNumber || null,
        contract_id: mappedInst.contractId || null,
        photos: [],
        completion_date: mappedInst.completedDate || mappedInst.scheduledDate || null,
        source: 'installation',
        installation_id: mappedInst.id,
    });
  });

  // Contracts
  contracts.forEach(contract => {
    const mappedContract = {
      id: contract.id,
      offerId: contract.offer_id,
      contractNumber: contract.contract_data?.contractNumber,
      status: contract.status,
      client: contract.contract_data?.client,
      product: contract.contract_data?.product,
      createdAt: new Date(contract.created_at)
    };

    if (installationOfferIds.has(mappedContract.offerId)) return;
    if (realizationContractIds.has(mappedContract.id)) return;

    const client = mappedContract.client;
    if (!client) return;

    const geo = geoCoords.get(`c-${mappedContract.id}`);
    if (!geo) return;

    const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.company || '';
    const productDesc = mappedContract.product
        ? (typeof mappedContract.product === 'string' ? mappedContract.product : `${mappedContract.product.modelId || ''} ${mappedContract.product.width || ''}x${mappedContract.product.projection || ''}`)
        : 'Umowa';

    items.push({
        id: `c-${mappedContract.id}`,
        lat: geo.lat,
        lng: geo.lng,
        title: productDesc,
        description: null,
        product_type: 'Terrassenüberdachung',
        city: client.city || null,
        address: client.address || client.street || null,
        postal_code: client.postalCode || null,
        client_name: clientName,
        client_phone: client.phone || null,
        client_email: client.email || null,
        contract_number: mappedContract.contractNumber || null,
        contract_id: mappedContract.id,
        photos: [],
        completion_date: mappedContract.signedAt ? new Date(mappedContract.signedAt).toISOString() : mappedContract.createdAt ? new Date(mappedContract.createdAt).toISOString() : null,
        source: 'contract',
    });
  });

  console.log(`\nitems mapped: ${items.length}`);
  console.log("Sample mapped item (first contract):", items.find(i => i.source === 'contract'));
  console.log("Sample mapped item (first installation):", items.find(i => i.source === 'installation'));
}

test();
