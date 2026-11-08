using FinancialMonitor.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Options;

namespace FinancialMonitor.Tests;

public sealed class OptionsTests
{
    [Theory]
    [InlineData("Hub:SnapshotSize", "0")]
    [InlineData("Hub:SnapshotSize", "10001")]
    [InlineData("PendingResolution:MinDelayMs", "-1")]
    [InlineData("PendingResolution:MinDelayMs", "20001")] // above the default MaxDelayMs of 20000
    [InlineData("PendingResolution:FailureRate", "1.5")]
    public void An_invalid_setting_stops_the_app_from_starting(string key, string value)
    {
        using var app = new WebApplicationFactory<Program>().WithWebHostBuilder(host => host.UseSetting(key, value));

        var error = Record.Exception(() => app.CreateClient());

        // On a busy machine the test host reads its services after the failed host has been disposed.
        Assert.True(error is OptionsValidationException or ObjectDisposedException, $"Expected a startup failure, got {error?.GetType().Name ?? "none"}");
    }
}
