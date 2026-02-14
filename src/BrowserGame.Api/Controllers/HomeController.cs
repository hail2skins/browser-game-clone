using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api")]
public class HomeController : ControllerBase
{
    [HttpGet("status")]
    public IActionResult Get() => Ok(new {
        status = "Tribal Wars Clone API",
        swagger = "/swagger",
        timestamp = DateTime.UtcNow
    });
}
