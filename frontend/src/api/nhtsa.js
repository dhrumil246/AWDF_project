const BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

async function getJson(path, signal) {
  const res = await fetch(`${BASE_URL}${path}`, { signal });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  const data = await res.json();
  return data.Results;
}

export const getCarMakes = (signal) => getJson('/GetMakesForVehicleType/car?format=json', signal);

export const getModelsForMake = (make, signal) =>
  getJson(`/GetModelsForMake/${encodeURIComponent(make)}?format=json`, signal);
