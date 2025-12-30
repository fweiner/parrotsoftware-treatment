"""Unit tests for email service."""
import pytest
from unittest.mock import patch, MagicMock

from app.services.email_service import (
    get_first_name,
    send_invite_email,
    send_thank_you_email
)


class TestGetFirstName:
    """Tests for get_first_name function."""

    def test_single_name(self):
        """Test with a single name."""
        assert get_first_name("John") == "John"

    def test_full_name(self):
        """Test with first and last name."""
        assert get_first_name("John Doe") == "John"

    def test_multiple_names(self):
        """Test with multiple names."""
        assert get_first_name("John William Doe") == "John"

    def test_empty_string(self):
        """Test with empty string."""
        assert get_first_name("") == "there"

    def test_none_like(self):
        """Test with None-like value."""
        assert get_first_name("") == "there"


class TestSendInviteEmail:
    """Tests for send_invite_email function."""

    @pytest.mark.asyncio
    @patch("app.services.email_service.resend.Emails.send")
    async def test_send_invite_email_success(self, mock_send):
        """Test successful invite email sending."""
        mock_send.return_value = {"id": "email-123"}

        result = await send_invite_email(
            recipient_email="jane@example.com",
            recipient_name="Jane Smith",
            inviter_full_name="John Doe",
            invite_url="https://example.com/invite/token123",
            custom_message="Please help me with my recovery!"
        )

        assert result is True
        mock_send.assert_called_once()

        # Verify email content
        call_args = mock_send.call_args[0][0]
        assert call_args["to"] == ["jane@example.com"]
        assert "John" in call_args["subject"]
        assert "memory" in call_args["subject"].lower()
        assert "Please help me with my recovery!" in call_args["html"]
        assert "https://example.com/invite/token123" in call_args["html"]

    @pytest.mark.asyncio
    @patch("app.services.email_service.resend.Emails.send")
    async def test_send_invite_email_without_custom_message(self, mock_send):
        """Test invite email without custom message."""
        mock_send.return_value = {"id": "email-123"}

        result = await send_invite_email(
            recipient_email="jane@example.com",
            recipient_name="Jane Smith",
            inviter_full_name="John Doe",
            invite_url="https://example.com/invite/token123"
        )

        assert result is True
        mock_send.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.email_service.resend.Emails.send")
    async def test_send_invite_email_failure(self, mock_send):
        """Test invite email failure."""
        mock_send.side_effect = Exception("Email service error")

        result = await send_invite_email(
            recipient_email="jane@example.com",
            recipient_name="Jane Smith",
            inviter_full_name="John Doe",
            invite_url="https://example.com/invite/token123"
        )

        assert result is False


class TestSendThankYouEmail:
    """Tests for send_thank_you_email function."""

    @pytest.mark.asyncio
    @patch("app.services.email_service.resend.Emails.send")
    async def test_send_thank_you_email_success(self, mock_send):
        """Test successful thank you email sending."""
        mock_send.return_value = {"id": "email-456"}

        result = await send_thank_you_email(
            recipient_email="jane@example.com",
            recipient_name="Jane Smith",
            inviter_full_name="John Doe"
        )

        assert result is True
        mock_send.assert_called_once()

        # Verify email content
        call_args = mock_send.call_args[0][0]
        assert call_args["to"] == ["jane@example.com"]
        assert "Thank you" in call_args["subject"]
        assert "John" in call_args["subject"]
        assert "Jane" in call_args["html"]

    @pytest.mark.asyncio
    @patch("app.services.email_service.resend.Emails.send")
    async def test_send_thank_you_email_failure(self, mock_send):
        """Test thank you email failure."""
        mock_send.side_effect = Exception("Email service error")

        result = await send_thank_you_email(
            recipient_email="jane@example.com",
            recipient_name="Jane Smith",
            inviter_full_name="John Doe"
        )

        assert result is False
