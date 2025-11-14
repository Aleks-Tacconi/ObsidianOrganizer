# pylint: skip-file
# pyright: ignore[all]


def expose_endpoints() -> None:
    from .delete_note import delete_note
    from .get_note import get_note
    from .get_notes import get_notes
    from .set_note import set_note
