// Reading a JSON body without letting a malformed one throw past the handler.
//
// Every /admin/api write wants the same three lines, and a route that forgets
// the try/catch answers a 500 to a truncated request instead of the 400 the
// body deserves.

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}
