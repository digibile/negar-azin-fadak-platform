using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Api.Configuration;
using NegarAzinFadak.Api.Endpoints;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddPlatformServices(builder.Configuration, builder.Environment);
builder.Services.AddPlatformAuthentication(builder.Configuration);
builder.Services.AddPlatformPrincipal();
builder.Services.AddPlatformJwtAuthentication();
builder.Services.AddPlatformAuthorization();
builder.Services.AddPlatformOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseMiddleware<CorrelationIdMiddleware>();

app.UseAuthentication();
app.UseMiddleware<TenantScopeGuardMiddleware>();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi($"/openapi/{ApiVersion.DocumentName}.json");
}

// Liveness answers "is the process serving requests" and must not depend on a database, so a transient
// database outage never causes an orchestrator to restart otherwise healthy instances.
app.MapHealthChecks("/health/live", new()
{
    Predicate = registration => registration.Tags.Contains(ServiceRegistration.LivenessTag)
}).AllowAnonymous();

app.MapHealthChecks("/health/ready", new()
{
    Predicate = _ => true
}).AllowAnonymous();

app.MapGet("/", () => Results.Redirect($"/openapi/{ApiVersion.DocumentName}.json")).AllowAnonymous();

var api = app.MapGroup(ApiVersion.RoutePrefix);

api.MapGet("/ping", () => Results.Ok(new { status = "ok", version = ApiVersion.Major })).AllowAnonymous();

// The token endpoint is the only anonymous member of the versioned group, and it is mapped before the
// protected groups so its position in the pipeline is obvious from the composition root.
api.MapAuthenticationEndpoints();

api.MapPrincipalEndpoints();
api.MapTenancyEndpoints();
api.MapIdentityEndpoints();
api.MapDocumentEndpoints();
api.MapMenuEndpoints();

app.Run();

/// <summary>Entry point marker so the test host can reference this assembly.</summary>
public partial class Program;
