export async function handler(event) {
  const { _HANDLER } = process.env

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `This response is coming from the handler: ${_HANDLER}`,
    }),
  };
}
