namespace api.DTOs;

public record RegisterRequest(string Email, string Password, string InviteCode);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, bool IsApproved, bool IsAdmin);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
public record CreateInviteRequest(int? ExpiresInDays);
public record ApproveUserRequest(bool IsApproved);
