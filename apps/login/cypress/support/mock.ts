export function removeStub(service: string, method: string) {
  return cy.request({
    url: "http://localhost:22220/v1/stubs",
    method: "DELETE",
    qs: {
      service,
      method,
    },
  });
}

export function addStub(service: string, method: string, out?: any) {
  return cy.request({
    url: "http://localhost:22220/v1/stubs",
    method: "POST",
    body: {
      stubs: [
        {
          service,
          method,
          out,
        },
      ],
    },
  });
}
