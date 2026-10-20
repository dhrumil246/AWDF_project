// Hypermedia links (Richardson Level 3 / HATEOAS): each response says what
// the client can do next, so clients follow links instead of hardcoding URLs.

const link = (href, method = 'GET', extra = {}) => ({ href, method, ...extra });

// Links for one car. Only the owner gets modifying links, and the status
// action offered depends on the car's current state.
function carLinks(car, user) {
  const self = `/cars/${car.id}`;
  const links = { self: link(self), collection: link('/cars') };

  if (user && car.owner?.id === user.id) {
    links.update = link(self, 'PATCH');
    links.replace = link(self, 'PUT');
    links.delete = link(self, 'DELETE');
    links[car.status === 'available' ? 'markSold' : 'markAvailable'] = link(self, 'PATCH', {
      body: { status: car.status === 'available' ? 'sold' : 'available' },
    });
  }
  return links;
}

// Adds _links without mutating the (possibly cached) car object.
const withLinks = (car, user) => ({ ...car, _links: carLinks(car, user) });

// Entry point for discovering the API from GET /.
const rootLinks = {
  self: link('/'),
  register: link('/auth/register', 'POST'),
  login: link('/auth/login', 'POST'),
  me: link('/auth/me'),
  cars: link('/cars'),
  createCar: link('/cars', 'POST'),
  generateDescription: link('/api/ai/generate-description', 'POST'),
};

module.exports = { carLinks, withLinks, rootLinks };
