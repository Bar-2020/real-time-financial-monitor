var builder = DistributedApplication.CreateBuilder(args);

// The same image as the Kubernetes manifests. Aspire runs it without persistence, because it only relays messages.
var redis = builder.AddRedis("redis").WithImageTag("7-alpine");

// WithReference sets ConnectionStrings__redis, which the API already reads as ConnectionStrings:Redis.
builder.AddProject<Projects.FinancialMonitor_Api>("api")
    .WithReplicas(5)
    .WithReference(redis)
    .WaitFor(redis)
    .WithHttpHealthCheck("/health");

builder.Build().Run();
