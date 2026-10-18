from datetime import date

import pytest

from app import budget as b


def base(**over):
    kw = dict(days=4, travelers=3, stay_per_night=1000, food_per_day=500, local_per_day=200,
              activities_per_day=100, transport_round_trip_per_person=1000, activity_fees_per_person=300,
              travel_style="budget")
    kw.update(over)
    return b.calculate_budget(**kw)


def test_budget_hand_calculated_values():
    # nights=3, rooms=2: stay 1000*0.85*2*3=5100; food 500*0.9*3*4=5400; transport 3000;
    # activities (300+100*4)*3=2100; local 200*3*4=2400; core=18000; misc 8%=1440; buffer 10%=1800
    r = base()
    c = r["categories"]
    assert c["accommodation"] == 5100
    assert c["food"] == 5400
    assert c["transport"] == 3000
    assert c["activities"] == 2100
    assert c["local_transport"] == 2400
    assert c["shopping_misc"] == 1440
    assert c["emergency_buffer"] == 1800
    assert r["total"] == 21240
    assert r["per_person"] == 7080
    assert r["per_day"] == 5310
    assert r["is_estimate"] is True


def test_hostel_is_cheaper_than_hotel():
    assert base(accommodation="hostel")["categories"]["accommodation"] == 3300
    assert base(accommodation="hotel")["categories"]["accommodation"] > base()["categories"]["accommodation"]


def test_rooms_round_up():
    assert b.rooms_needed(1) == 1 and b.rooms_needed(2) == 1 and b.rooms_needed(3) == 2 and b.rooms_needed(5) == 3


def test_single_day_has_no_accommodation():
    assert base(days=1)["categories"]["accommodation"] == 0


def test_trip_days_inclusive_and_validation():
    assert b.trip_days(date(2027, 1, 1), date(2027, 1, 1)) == 1
    assert b.trip_days(date(2027, 1, 1), date(2027, 1, 4)) == 4
    with pytest.raises(ValueError):
        b.trip_days(date(2027, 1, 5), date(2027, 1, 1))


def test_invalid_inputs_rejected():
    with pytest.raises(ValueError):
        base(travelers=0)
    with pytest.raises(ValueError):
        base(days=0)


def test_budget_status_and_alternatives():
    r = base()
    over = b.budget_status(r["total"], 20000)
    assert over["within_budget"] is False and over["difference"] == -1240
    assert b.budget_status(r["total"], 25000)["within_budget"] is True
    assert b.cheaper_alternatives(r, 20000)          # non-empty when over
    assert b.cheaper_alternatives(r, 30000) == []    # empty when within budget


def test_summarize_recalculates_after_manual_edit():
    r = base()
    edited = dict(r["categories"], food=0)
    s = b.summarize(edited, days=4, travelers=3, budget=20000)
    assert s["total"] == r["total"] - r["categories"]["food"]


def test_daily_breakdown_sums_close_to_total_minus_buffer():
    r = base()
    daily = b.daily_breakdown(r, 4)
    assert len(daily) == 4
    assert abs(sum(d["amount"] for d in daily) - (r["total"] - r["categories"]["emergency_buffer"])) <= 4
