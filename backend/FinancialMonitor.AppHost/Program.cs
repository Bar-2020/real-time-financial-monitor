var builder = DistributedApplication.CreateBuilder(args);

// The same image as the Kubernetes manifests. Aspire runs it without persistence, because it only relays messages.
var redis = builder.AddRedis("redis").WithImageTag("7-alpine");

// The proxy port, 5080, comes from the API's launchSettings.json and is the one the frontend's Vite proxy expects.
// WithReference sets ConnectionStrings__redis, which the API already reads as ConnectionStrings:Redis.
builder.AddProject<Projects.FinancialMonitor_Api>("api")
    .WithReplicas(5)
    .WithReference(redis)
    .WaitFor(redis)
    .WithHttpHealthCheck("/health");

builder.Build().Run();
