#!/usr/bin/env python3
from astral import LocationInfo
from astral.sun import sun
from datetime import date
from zoneinfo import ZoneInfo

city = LocationInfo(
    name="Santa Maria",
    region="Azores",
    timezone="Atlantic/Azores",
    latitude=36.97,
    longitude=-25.10,
)

s = sun(city.observer, date=date.today(), tzinfo=ZoneInfo("Atlantic/Azores"))

def minutes(dt):
    return dt.hour * 60 + dt.minute

print(f"SUNRISE_MIN={minutes(s['sunrise'])}")
print(f"SUNSET_MIN={minutes(s['sunset'])}")
print(f"SUNRISE_TEXT={s['sunrise'].strftime('%H:%M')}")
print(f"SUNSET_TEXT={s['sunset'].strftime('%H:%M')}")
