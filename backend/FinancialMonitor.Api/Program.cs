using FinancialMonitor.Api.Hubs;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Services;
using FinancialMonitor.Api.Validators;
using FluentValidation;

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
        builder.Services.AddSingleton<IValidator<Transaction>, TransactionValidator>();
        builder.Services.AddSingleton<RedisSync>();
        builder.Services.AddHostedService(services => services.GetRequiredService<RedisSync>());

        var app = builder.Build();

        app.MapHealthChecks("/health");
        app.MapHub<TransactionHub>("/hubs/transactions");
        app.MapPost("/api/transactions", async (
            Transaction transaction,
            IValidator<Transaction> validator,
            TransactionProcessor processor,
            RedisSync redisSync) =>
        {
            var validation = validator.Validate(transaction);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            await processor.ApplyAsync(transaction);
            await redisSync.PublishAsync(transaction);
            return Results.Accepted();
        });

        app.Run();
    }
}
