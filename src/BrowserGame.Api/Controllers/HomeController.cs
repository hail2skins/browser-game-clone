using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("/")]
public class HomeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { 
        status = "Tribal Wars Clone API is running", 
        timestamp = DateTime.UtcNow 
    });
}
