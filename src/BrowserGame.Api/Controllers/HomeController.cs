using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
public class HomeController : ControllerBase
{
    [HttpGet("/")]
    public IActionResult Get() => Ok(new { 
        status = "Tribal Wars Clone API", 
        swagger = "/swagger",
        timestamp = DateTime.UtcNow 
    });
}
