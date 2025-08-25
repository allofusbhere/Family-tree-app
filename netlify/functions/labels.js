exports.handler = async function(event, context) {
  // Read-only stub that returns a fixed mapping. Replace with your store.
  const labels = {
    "100000": "Branch Leader",
    "140000": "Aaron",
    "240000": "Damita"
  };
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(labels)
  };
};
