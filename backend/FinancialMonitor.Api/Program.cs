using FinancialMonitor.Api.Hubs;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Services;
using FinancialMonitor.Api.Validators;

namespace FinancialMonitor.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddSignalR();
        builder.Services.AddHealthChecks();
        builder.Services.AddSingleton<TransactionStore>();
        builder.Services.AddSingleton<TransactionProcessor>();
        builder.Services.AddSingleton<PendingResolver>();
        builder.Services.AddSingleton<RedisSync>();
        builder.Services.AddHostedService(services => services.GetRequiredService<RedisSync>());

        var app = builder.Build();

        app.MapHealthChecks("/health");
        app.MapHub<TransactionHub>("/hubs/transactions");
        app.MapPost("/api/transactions", async (
            Transaction transaction,
            TransactionProcessor processor,
            RedisSync redisSync,
            PendingResolver resolver) =>
        {
            var errors = TransactionValidator.Validate(transaction);
            if (errors.Count > 0)
                return Results.ValidationProblem(errors);

            var applied = await processor.ApplyAsync(transaction);
            await redisSync.PublishAsync(transaction);
            if (applied && transaction.Status == TransactionStatus.Pending)
                resolver.Schedule(transaction.TransactionId);
            return Results.Accepted();
        });

        app.Run();
    }
}
