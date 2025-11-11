# pylint: skip-file
# pyright: ignore[all]


def expose_endpoints() -> None:
    from .add_note import add_note
    from .delete_note import delete_note
    from .get_note import get_note
    from .get_notes import get_notes
