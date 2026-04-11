"""
BCABuddy Password Reset Models and Utilities - Author: Saurav Kumar
"""
from pydantic import BaseModel


class ForgotPasswordRequest(BaseModel):
    """Request model for initiating password reset"""
    username: str


class ResetPasswordRequest(BaseModel):
    """Request model for resetting password with token"""
    reset_token: str
    new_password: str
    confirm_password: str


class ForgotPasswordResponse(BaseModel):
    """Response model for forgot password request"""
    message: str
    reset_token: str
    expires_in_minutes: int


class ResetPasswordResponse(BaseModel):
    """Response model for password reset"""
    message: str
    success: bool
