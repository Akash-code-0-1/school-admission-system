using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using SchoolAdmission.Api.DTOs;
using Xunit;

namespace SchoolAdmission.Tests;

public class AdmissionTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AdmissionTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    // Test 1: Class creation, seat hold, and fee confirmation
    [Fact]
    public async Task CreateClass_HoldSeat_AndConfirm_ShouldSucceed()
    {
        // 1. Create Class
        var classReq = new CreateClassRequest("Class 6 - Morning Shift", 50);
        var createRes = await _client.PostAsJsonAsync("/classes", classReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdClass = await createRes.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);

        // 2. Hold Seat
        string studentId = "20152691234567890";
        var holdReqMessage = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        holdReqMessage.Headers.Add("X-Student-Id", studentId);
        var holdRes = await _client.SendAsync(holdReqMessage);
        Assert.Equal(HttpStatusCode.Created, holdRes.StatusCode);
        var holdData = await holdRes.Content.ReadFromJsonAsync<HoldCreatedResponse>();
        Assert.NotNull(holdData);
        Assert.Equal("HELD", holdData.Status);

        // 3. Confirm Hold
        var confirmReqMessage = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdData.HoldId}/confirm");
        confirmReqMessage.Headers.Add("X-Student-Id", studentId);
        var confirmRes = await _client.SendAsync(confirmReqMessage);
        Assert.Equal(HttpStatusCode.OK, confirmRes.StatusCode);
        var confirmData = await confirmRes.Content.ReadFromJsonAsync<HoldConfirmResponse>();
        Assert.NotNull(confirmData);
        Assert.Equal("CONFIRMED", confirmData.Status);
    }

    // Test 2: Rule #3 - Single active hold or confirmed admission per student in a class
    [Fact]
    public async Task SameStudent_CannotHoldTwiceInSameClass()
    {
        // Create Class
        var classReq = new CreateClassRequest("Class 7 - Day Shift", 30);
        var createRes = await _client.PostAsJsonAsync("/classes", classReq);
        var createdClass = await createRes.Content.ReadFromJsonAsync<ClassResponse>();

        string studentId = "20152691234567891";

        // First Hold
        var holdReq1 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass!.Id}/holds");
        holdReq1.Headers.Add("X-Student-Id", studentId);
        var holdRes1 = await _client.SendAsync(holdReq1);
        Assert.Equal(HttpStatusCode.Created, holdRes1.StatusCode);

        // Second Hold attempt by same student in same class
        var holdReq2 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        holdReq2.Headers.Add("X-Student-Id", studentId);
        var holdRes2 = await _client.SendAsync(holdReq2);
        
        // Must return 409 Conflict
        Assert.Equal(HttpStatusCode.Conflict, holdRes2.StatusCode);
    }

    // Test 3: Concurrency Test (Rule #1) - Total holds can NEVER exceed totalSeats
    [Fact]
    public async Task ConcurrentHolds_ShouldNeverExceedTotalSeats()
    {
        const int totalSeats = 5;
        const int totalRequests = 20;

        // Create class with only 5 seats
        var classReq = new CreateClassRequest("Class 10 - Science", totalSeats);
        var createRes = await _client.PostAsJsonAsync("/classes", classReq);
        var createdClass = await createRes.Content.ReadFromJsonAsync<ClassResponse>();

        var responses = new List<HttpResponseMessage>();

        // Send 20 concurrent requests with 20 distinct 17-digit student IDs
        await Parallel.ForEachAsync(Enumerable.Range(10, totalRequests), async (i, ct) =>
        {
            string studentId = $"201526912345678{i:D2}";
            var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass!.Id}/holds");
            request.Headers.Add("X-Student-Id", studentId);
            
            var res = await _client.SendAsync(request, ct);
            lock (responses)
            {
                responses.Add(res);
            }
        });

        int successCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        int conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        // Exactly totalSeats must be created, all rest must receive 409 Conflict
        Assert.Equal(totalSeats, successCount);
        Assert.Equal(totalRequests - totalSeats, conflictCount);
    }
}