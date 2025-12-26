"""Unit tests for speech service."""
import pytest


@pytest.mark.asyncio
async def test_speech_to_text_success(mocker):
    """Test successful speech-to-text conversion."""
    from app.services.speech_service import SpeechService

    # Mock Google Cloud Speech client
    mock_alternative = mocker.Mock()
    mock_alternative.transcript = "Hello world"
    mock_alternative.confidence = 0.95

    mock_result = mocker.Mock()
    mock_result.alternatives = [mock_alternative]

    mock_response = mocker.Mock()
    mock_response.results = [mock_result]

    mock_client = mocker.Mock()
    mock_client.recognize.return_value = mock_response

    # Patch the client creation
    mocker.patch("app.services.speech_service.speech.SpeechClient", return_value=mock_client)

    service = SpeechService()
    text, confidence = await service.speech_to_text(b"fake_audio_data")

    assert text == "Hello world"
    assert confidence == 0.95
    mock_client.recognize.assert_called_once()


@pytest.mark.asyncio
async def test_speech_to_text_empty_results(mocker):
    """Test speech-to-text with no results."""
    from app.services.speech_service import SpeechService

    # Mock empty response
    mock_response = mocker.Mock()
    mock_response.results = []

    mock_client = mocker.Mock()
    mock_client.recognize.return_value = mock_response

    mocker.patch("app.services.speech_service.speech.SpeechClient", return_value=mock_client)

    service = SpeechService()
    text, confidence = await service.speech_to_text(b"fake_audio_data")

    assert text == ""
    assert confidence is None


@pytest.mark.asyncio
async def test_speech_to_text_with_language_code(mocker):
    """Test speech-to-text with custom language code."""
    from app.services.speech_service import SpeechService

    mock_alternative = mocker.Mock()
    mock_alternative.transcript = "Hola mundo"
    mock_alternative.confidence = 0.92

    mock_result = mocker.Mock()
    mock_result.alternatives = [mock_alternative]

    mock_response = mocker.Mock()
    mock_response.results = [mock_result]

    mock_client = mocker.Mock()
    mock_client.recognize.return_value = mock_response

    mocker.patch("app.services.speech_service.speech.SpeechClient", return_value=mock_client)

    service = SpeechService()
    text, confidence = await service.speech_to_text(b"fake_audio_data", language_code="es-ES")

    assert text == "Hola mundo"
    assert confidence == 0.92


@pytest.mark.asyncio
async def test_speech_to_text_error(mocker):
    """Test speech-to-text with error."""
    from app.services.speech_service import SpeechService

    mock_client = mocker.Mock()
    mock_client.recognize.side_effect = Exception("API Error")

    mocker.patch("app.services.speech_service.speech.SpeechClient", return_value=mock_client)

    service = SpeechService()

    with pytest.raises(Exception) as exc_info:
        await service.speech_to_text(b"fake_audio_data")

    assert "API Error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_text_to_speech_success(mocker):
    """Test successful text-to-speech conversion."""
    from app.services.speech_service import SpeechService

    # Mock Google Cloud TTS client
    mock_response = mocker.Mock()
    mock_response.audio_content = b"fake_audio_content"

    mock_client = mocker.Mock()
    mock_client.synthesize_speech.return_value = mock_response

    mocker.patch("app.services.speech_service.texttospeech.TextToSpeechClient", return_value=mock_client)

    service = SpeechService()
    audio = await service.text_to_speech("Hello world")

    assert audio == b"fake_audio_content"
    mock_client.synthesize_speech.assert_called_once()


@pytest.mark.asyncio
async def test_text_to_speech_with_language_code(mocker):
    """Test text-to-speech with custom language code."""
    from app.services.speech_service import SpeechService

    mock_response = mocker.Mock()
    mock_response.audio_content = b"fake_audio_content"

    mock_client = mocker.Mock()
    mock_client.synthesize_speech.return_value = mock_response

    mocker.patch("app.services.speech_service.texttospeech.TextToSpeechClient", return_value=mock_client)

    service = SpeechService()
    audio = await service.text_to_speech("Hola mundo", language_code="es-ES")

    assert audio == b"fake_audio_content"

    # Verify the voice parameters were set correctly
    call_args = mock_client.synthesize_speech.call_args
    assert call_args.kwargs["voice"].language_code == "es-ES"


@pytest.mark.asyncio
async def test_text_to_speech_with_voice_name(mocker):
    """Test text-to-speech with specific voice name."""
    from app.services.speech_service import SpeechService

    mock_response = mocker.Mock()
    mock_response.audio_content = b"fake_audio_content"

    mock_client = mocker.Mock()
    mock_client.synthesize_speech.return_value = mock_response

    mocker.patch("app.services.speech_service.texttospeech.TextToSpeechClient", return_value=mock_client)

    service = SpeechService()
    audio = await service.text_to_speech(
        "Hello world",
        language_code="en-US",
        voice_name="en-US-Wavenet-A"
    )

    assert audio == b"fake_audio_content"

    # Verify the voice name was set
    call_args = mock_client.synthesize_speech.call_args
    assert call_args.kwargs["voice"].name == "en-US-Wavenet-A"


@pytest.mark.asyncio
async def test_text_to_speech_error(mocker):
    """Test text-to-speech with error."""
    from app.services.speech_service import SpeechService

    mock_client = mocker.Mock()
    mock_client.synthesize_speech.side_effect = Exception("TTS API Error")

    mocker.patch("app.services.speech_service.texttospeech.TextToSpeechClient", return_value=mock_client)

    service = SpeechService()

    with pytest.raises(Exception) as exc_info:
        await service.text_to_speech("Hello world")

    assert "TTS API Error" in str(exc_info.value)


def test_get_speech_client_singleton(mocker):
    """Test that speech client is reused (singleton pattern)."""
    from app.services.speech_service import SpeechService

    mock_client = mocker.Mock()
    mocker.patch("app.services.speech_service.speech.SpeechClient", return_value=mock_client)

    service = SpeechService()
    client1 = service._get_speech_client()
    client2 = service._get_speech_client()

    assert client1 is client2


def test_get_tts_client_singleton(mocker):
    """Test that TTS client is reused (singleton pattern)."""
    from app.services.speech_service import SpeechService

    mock_client = mocker.Mock()
    mocker.patch("app.services.speech_service.texttospeech.TextToSpeechClient", return_value=mock_client)

    service = SpeechService()
    client1 = service._get_tts_client()
    client2 = service._get_tts_client()

    assert client1 is client2
