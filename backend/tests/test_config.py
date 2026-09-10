"""Config tests: new Supabase key names + legacy fallback (no DB)."""

from app.core.config import Settings


def test_new_key_names(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "sb_secret_y")
    settings = Settings()
    assert settings.supabase_publishable_key == "sb_publishable_x"
    assert settings.supabase_secret_key == "sb_secret_y"


def test_legacy_key_fallback(monkeypatch) -> None:
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_ANON_KEY", "legacy-anon")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "legacy-service")
    settings = Settings()
    assert settings.supabase_publishable_key == "legacy-anon"
    assert settings.supabase_secret_key == "legacy-service"


def test_new_names_win_over_legacy(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_new")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "legacy-anon")
    settings = Settings()
    assert settings.supabase_publishable_key == "sb_publishable_new"
