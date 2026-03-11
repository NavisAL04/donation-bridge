// Shared state — simpan di global supaya tidak reset tiap request
if (!global._donationStore) {
  global._donationStore = {
    donations: [],
    sessions:  {},
    counter:   Date.now(),
  };
}

const store = global._donationStore;

function addDonation(data) {
  store.counter++;
  const d = {
    id:        String(store.counter),
    source:    data.source    || 'unknown',
    donorName: data.donorName || 'Anonim',
    amount:    Number(data.amount) || 0,
    currency:  data.currency  || 'IDR',
    message:   data.message   || '',
    createdAt: Date.now(),
  };
  store.donations.push(d);
  if (store.donations.length > 500) store.donations.splice(0, store.donations.length - 500);
  return d;
}

function getDonationsAfter(afterId) {
  const afterNum = Number(afterId) || 0;
  return store.donations.filter(d => Number(d.id) > afterNum);
}

function getLatest() {
  return store.donations[store.donations.length - 1] || null;
}

function getSessions() {
  return store.sessions;
}

module.exports = { addDonation, getDonationsAfter, getLatest, getSessions };
