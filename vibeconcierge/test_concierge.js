async function test() {
  const res = await fetch("http://localhost:8082/api/concierge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientName: "Kenji", destinationCity: "London", profileUrl: "", socialText: "Kenji loves vinyl bars and design." })
  });
  console.log("Status:", res.status);
  const json = await res.json();
  console.log("Output keys:", Object.keys(json));
}
test();
