from django.db.models import Max
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ModuleInfo, PrimaryTag, Section, SubTag


@receiver(post_save, sender=PrimaryTag)
def create_module_info(sender, instance: PrimaryTag, created: bool, **kwargs):
    _ = kwargs
    _ = sender

    if created:
        ModuleInfo.objects.create(primary_tag=instance)


@receiver(post_save, sender=SubTag)
def create_section(sender, instance: SubTag, created: bool, **kwargs):
    _ = kwargs
    _ = sender

    if created:
        module_info = ModuleInfo.objects.get(primary_tag=instance.parent)
        max_position = (
            module_info.sections.aggregate(max_position=Max("position"))["max_position"]
            or -1
        )
        Section.objects.create(
            module_info=module_info,
            subtag=instance,
            position=max_position + 1,
        )
