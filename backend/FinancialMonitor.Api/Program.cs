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

        var app = builder.Build();

        app.MapHealthChecks("/health");
        app.MapHub<TransactionHub>("/hubs/transactions");
        app.MapPost("/api/transactions", async (
            Transaction tx,
            IValidator<Transaction> validator,
            TransactionProcessor processor) =>
        {
            var validation = validator.Validate(tx);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            await processor.ApplyAsync(tx);
            return Results.Accepted();
        });

        app.Run();
    }
}
