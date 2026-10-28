import json
from functools import lru_cache
from pathlib import Path
from django import forms
from django.utils import timezone


@lru_cache(maxsize=1)
def catalogue():
    return json.loads(Path(__file__).with_name("catalogue.json").read_text(encoding="utf-8"))


class ReviewForm(forms.Form):
    albumId = forms.CharField(max_length=100)
    target = forms.CharField(max_length=30)
    date = forms.DateField(input_formats=["%Y-%m-%d"], required=False)
    rating = forms.IntegerField(min_value=1, max_value=5)
    note = forms.CharField(max_length=500, required=False, strip=True)
    repeat = forms.BooleanField(required=False)
    clientId = forms.CharField(max_length=128)

    def clean(self):
        data = super().clean()
        album_id, target = data.get("albumId"), data.get("target")
        if album_id not in catalogue():
            self.add_error("albumId", "Choose a known album.")
        elif target != "album" and target not in catalogue()[album_id]:
            self.add_error("target", "Choose a track from this album.")
        if data.get("date") and data["date"] > timezone.localdate():
            self.add_error("date", "The listening date cannot be in the future.")
        return data
