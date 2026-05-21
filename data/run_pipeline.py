"""
Ported from architect_query.ipynb to refresh the Archinect salary dataset.

Changes vs. the notebook (it had been >1 year since last run):
  * iDisplayLength raised so the full poll (now ~15.6k rows) is captured
    instead of being silently truncated at 15000.
  * CPI inflation adjustment is now generic: any survey month newer than
    the latest CPI observation is forward-filled with the latest CPI
    (replaces the hardcoded 2025-02/03 patch).
  * Output filenames carry a YYMMDD prefix (matching 241209_*.csv).
  * Plot-only cells (matplotlib/seaborn) are omitted; they didn't affect
    the exported CSVs.
Everything else mirrors the notebook's cleaning logic exactly.
"""

import csv
import re
import sys
from datetime import date

import pandas as pd
import requests
from bs4 import BeautifulSoup
import time

from geopy.geocoders import Nominatim

DATE_PREFIX = date.today().strftime("%y%m%d")  # e.g. 260518
RAW_OUT = f"{DATE_PREFIX}_archinect_salaries_raw.csv"
FULLTIME_OUT = f"{DATE_PREFIX}_archinect_salaries_fulltime.csv"


# --------------------------------------------------------------------------
# Parsing helpers (verbatim from the notebook)
# --------------------------------------------------------------------------
def parse_details1(details_1):
    firm_type = "NA"
    firm_size = "NA"
    health_insurance = "NA"
    overtime = "NA"
    vacation_days = "NA"
    annual_bonus = "NA"
    for detail in details_1:
        if detail == "":
            continue
        elif "People" in detail:
            firm_size = detail
        elif "Health Insurance" in detail:
            health_insurance = "Yes"
        elif "Overtime" in detail:
            overtime = detail
        elif "Days Vacation" in detail:
            vacation_days = detail.replace(" Days Vacation", "")
        elif "Bonus" in detail:
            annual_bonus = detail.replace("$", "").replace(" Bonus", "")
        else:
            firm_type = detail
    return firm_type, firm_size, health_insurance, overtime, vacation_days, annual_bonus


def parse_details2(details_2):
    work_status = "NA"
    years_of_experience = "NA"
    age = "NA"
    gender = "NA"
    licensed = "No"
    for detail in details_2:
        if detail == "":
            continue
        elif "time" in detail:
            work_status = detail
        elif "Freelance" in detail:
            work_status = detail
        elif "Years of Experience" in detail:
            if "<" in detail:
                years_of_experience = "< 1"
            else:
                years_of_experience = detail.split()[0]
        elif "Years old" in detail:
            age = detail.split()[0]
        elif "Licensed" in detail:
            licensed = "Licensed"
        else:
            gender = detail
    return work_status, years_of_experience, age, gender, licensed


def parse_entry(entry):
    id = entry[0]
    soup = BeautifulSoup(entry[1], "html.parser")

    job_satisfaction_img = soup.find("img", class_="emoticon")
    if job_satisfaction_img and job_satisfaction_img.has_attr("data-original-title"):
        job_satisfaction = job_satisfaction_img["data-original-title"].split(": ")[1]
    else:
        job_satisfaction = "NA"

    h3 = soup.find("h3")
    if h3:
        salary_tag = h3.find("span", class_="salary")
        salary = re.sub(r"[^0-9,]", "", salary_tag.text) if salary_tag else "NA"
        salary_unit = re.sub(r"[^a-zA-Z]", "", salary_tag.text) if salary_tag else "NA"
        location_tag = (
            h3.find_next("span", class_="slash").next_sibling
            if h3.find("span", class_="slash")
            else ""
        )
        location = location_tag.strip() if location_tag else "NA"
        job_title_tag = (
            h3.find_all("span", class_="slash")[-1].next_sibling
            if h3.find_all("span", class_="slash")
            else ""
        )
        job_title = job_title_tag.strip() if job_title_tag else "NA"
    else:
        salary = location = job_title = "NA"
        salary_unit = "NA"

    subcol_1 = soup.find("ul", class_="subcol-1")
    details_1 = [li.get_text(strip=True) for li in subcol_1.find_all("li")] if subcol_1 else []
    firm_type, firm_size, health_insurance, overtime, vacation_days, annual_bonus = parse_details1(details_1)

    subcol_2 = soup.find("ul", class_="subcol-2")
    details_2 = [li.get_text(strip=True) for li in subcol_2.find_all("li")] if subcol_2 else []
    work_status, years_of_experience, age, gender, licensed = parse_details2(details_2)

    subcol_3 = soup.find("ul", class_="subcol-3")
    details_3 = [li.get_text(strip=True) for li in subcol_3.find_all("li")] if subcol_3 else []
    undergraduate_school = next((x.replace("UG: ", "").strip() for x in details_3 if x.startswith("UG:")), "NA")
    graduate_school = next((x.replace("Grad: ", "").strip() for x in details_3 if x.startswith("Grad:")), "NA")
    post_graduate_school = next((x.replace("PhD: ", "").strip() for x in details_3 if x.startswith("PhD:")), "NA")

    date_stamp = soup.find("div", class_="date-stamp")
    date_val = date_stamp.get_text(strip=True) if date_stamp else "NA"

    return {
        "id": id,
        "Job Satisfaction": job_satisfaction,
        "Salary": salary,
        "Salary Unit": salary_unit,
        "Location": location,
        "Job Title": job_title,
        "Firm Type": firm_type,
        "Firm Size": firm_size,
        "Health Insurance": health_insurance,
        "Overtime": overtime,
        "Vacation Days": vacation_days,
        "Annual Bonus": annual_bonus,
        "Work Status": work_status,
        "Years of Experience": years_of_experience,
        "Age": age,
        "Gender": gender,
        "Licensed": licensed,
        "Undergraduate School": undergraduate_school,
        "Graduate School": graduate_school,
        "Post-Graduate School": post_graduate_school,
        "Date": date_val,
    }


def query_data():
    url = "https://salaries.archinect.com/salarypoll/results"
    params = {
        "sEcho": "2", "iColumns": "2", "sColumns": "",
        "iDisplayStart": "0",
        "iDisplayLength": "50000",  # was 15000; poll now has ~15.6k rows
        "mDataProp_0": "0", "mDataProp_1": "1",
        "sSearch": "", "bRegex": "false",
        "sSearch_0": "", "bRegex_0": "false", "bSearchable_0": "false",
        "sSearch_1": "", "bRegex_1": "false", "bSearchable_1": "true",
        "iSortCol_0": "0", "sSortDir_0": "asc", "iSortingCols": "1",
        "bSortable_0": "true", "bSortable_1": "false",
        "age": "[]", "gender": "[]", "job_title": "[]", "primary_market": "[]",
        "experience": "[]", "firm_type": "[]", "firm_size": "[]",
        "work_status": "[]", "license": "[]", "health_insurance": "[]",
        "overtime": "[]", "annual_bonus": "[]", "sort_by": "id",
        "salary-range": "0;10000000", "range_plus": "true",
        "location": "United States", "under_graduate_school": "",
        "graduate_school": "", "post_graduate_school": "",
        "location_type": "country", "salary_time": "[]",
        "job_satisfaction": "[]", "_": "1728972672843",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        "X-Requested-With": "XMLHttpRequest",
    }
    response = requests.get(url, params=params, headers=headers, timeout=120)
    if response.status_code != 200:
        sys.exit(f"Failed to retrieve data. Status code: {response.status_code}")
    json_data = response.json()
    total = json_data.get("iTotalRecords")
    parsed_data = []
    for entry in json_data["aaData"]:
        if entry[0] != "":
            parsed_data.append(parse_entry(entry))
    print(f"  iTotalRecords reported by site: {total}")
    print(f"  rows fetched: {len(json_data['aaData'])}, parsed (non-empty id): {len(parsed_data)}")
    return pd.DataFrame(parsed_data)


# --------------------------------------------------------------------------
# Run
# --------------------------------------------------------------------------
print("1/6  Querying Archinect salary poll ...")
df = query_data()
df.to_csv(RAW_OUT, index=False)
raw_rows = df.shape[0]
print(f"  wrote {RAW_OUT}  ({raw_rows} rows)")

# Round-trip through the raw CSV so the literal "NA" sentinels become NaN,
# exactly as the notebook relied on pd.read_csv doing.
df = pd.read_csv(RAW_OUT)

print("2/6  Cleaning ...")
df["Undergraduate School"] = df["Undergraduate School"].str.replace("UG:", "")
df["Graduate School"] = df["Graduate School"].str.replace("Grad:", "")
df["Post-Graduate School"] = df["Post-Graduate School"].str.replace("PhD:", "")
df["Salary Unit"] = df["Salary Unit"].str.replace("per", "")
df["Gender"] = df["Gender"].str.replace("Gender: ", "")
df["Licensed"] = df["Licensed"].str.replace("Licensed", "Yes")
df["Years of Experience"] = df["Years of Experience"].replace(
    {"31- >40": "30-40", "40": "> 40"}
)
df = df[df["Age"] != "103"]
df = df[df["id"] != 12734]
df = df[df["id"] != 2653]

for col in ["Undergraduate School", "Graduate School", "Post-Graduate School"]:
    df[col] = df[col].str.replace(
        "University of Hawai.i at M.noa", "University of Hawaiʻi at Mānoa", regex=True
    )

print(f"  rows after basic cleaning: {df.shape[0]}")

# de-duplicate (people who clicked submit multiple times)
df.drop_duplicates(subset=df.columns.difference(["id"]), keep="first", inplace=True)

# known-bad batch
criteria = (
    df["Post-Graduate School"].notna()
    & (df["Date"] == "Jun '24")
    & (df["Location"] == "Austin, TX, US")
)
df.drop(df[criteria].index, inplace=True)

df["Date"] = df["Date"].str.replace("'", "")
df["Date"] = pd.to_datetime(df["Date"], format="%b %y")
df["Year"] = df["Date"].dt.year

assert (df["Salary"] == "NA").sum() == 0
df["Salary"] = df["Salary"].str.replace(",", "").astype(int)

assert (df["Job Satisfaction"] == "NA").sum() == 0
df["Job Satisfaction"] = pd.to_numeric(df["Job Satisfaction"], errors="coerce")
df = df[df["Job Satisfaction"].notna()]
df["Job Satisfaction"] = df["Job Satisfaction"].astype(int)

print(f"  rows after de-dup + date/type parsing: {df.shape[0]}")
print("  work-status breakdown:")
print("    full time:    ", df[df["Work Status"] == "Full-time"].shape[0])
print("    part time:    ", df[df["Work Status"] == "Part-time"].shape[0])
print("    freelance:    ", df[df["Work Status"] == "Freelance"].shape[0])
print("    not specified:", df[df["Work Status"].isna()].shape[0])

print("3/6  Restricting to full-time / freelance, hourly->annual ...")
df_fulltime = df[df["Work Status"] != "Part-time"].copy()
df_fulltime["Salary"] = df_fulltime.apply(
    lambda x: x["Salary"] * 40 * 52
    if x["Salary Unit"] == "hour" and x["Work Status"] == "Full-time"
    else x["Salary"],
    axis=1,
)
df_fulltime = df_fulltime[df_fulltime["Salary"] >= 10000]

print("4/6  Geocoding locations ...")
geolocator = Nominatim(user_agent="architects_locations", timeout=10)


def get_coordinates(location, attempts=3):
    # Nominatim is a free service that often times out under default 1 s;
    # retry with backoff and respect the 1 req/s usage policy.
    for attempt in range(1, attempts + 1):
        try:
            loc = geolocator.geocode(location, timeout=15)
            if loc:
                print(f"    geocoded: {location} -> ({loc.latitude}, {loc.longitude})")
                return (loc.latitude, loc.longitude)
            print(f"    NOT FOUND: {location}")
            return (None, None)
        except Exception as e:
            print(f"    attempt {attempt}/{attempts} failed for {location}: {e}")
            time.sleep(2 * attempt)
    print(f"    GIVE UP: {location}")
    return (None, None)


location_df = pd.read_csv("location_coordinates.csv")
df_fulltime = df_fulltime.merge(location_df, on="Location", how="left")

df_fulltime["Firm Size"] = df_fulltime["Firm Size"].str.replace(" People", "")
df_fulltime["Firm Size"] = df_fulltime["Firm Size"].str.replace("501 +", "501+")

new_unique_locations = df_fulltime[df_fulltime["Latitude"].isna()]["Location"].unique()
print(f"  {len(new_unique_locations)} new location(s) to geocode")
new_location_coordinates = {}
for _loc in new_unique_locations:
    new_location_coordinates[_loc] = get_coordinates(_loc)
    time.sleep(1)  # respect Nominatim's 1 req/s usage policy

df_fulltime["Latitude"] = df_fulltime.apply(
    lambda x: new_location_coordinates[x["Location"]][0]
    if pd.isna(x["Latitude"])
    else x["Latitude"],
    axis=1,
)
df_fulltime["Longitude"] = df_fulltime.apply(
    lambda x: new_location_coordinates[x["Location"]][1]
    if pd.isna(x["Longitude"])
    else x["Longitude"],
    axis=1,
)

# Persist any newly-resolved coordinates back into the cache file so future
# runs don't have to re-query Nominatim.
resolved = {
    loc: coords
    for loc, coords in new_location_coordinates.items()
    if coords[0] is not None
}
if resolved:
    # The cache file historically has no trailing newline; appending without
    # first terminating the last line would mash the first new row onto it.
    with open("location_coordinates.csv", "rb") as f:
        needs_newline = f.seek(0, 2) > 0 and (f.seek(-1, 2), f.read(1))[1] != b"\n"
    with open("location_coordinates.csv", "a", newline="") as f:
        if needs_newline:
            f.write("\n")
        w = csv.writer(f, lineterminator="\n")
        for loc, (lat, lon) in resolved.items():
            w.writerow([loc, lat, lon])
    print(f"  appended {len(resolved)} new location(s) to location_coordinates.csv")

missing = df_fulltime[df_fulltime["Latitude"].isna()]["Location"].unique()
if len(missing):
    print(
        f"  WARNING: {len(missing)} location(s) could not be geocoded and will be "
        f"dropped (notebook's documented fallback):"
    )
    for m in missing:
        print(f"    - {m}")
    df_fulltime = df_fulltime.dropna(subset=["Latitude"])

df_fulltime["Location"] = df_fulltime["Location"].str.replace(", US", "")

print("5/6  Currency / unit corrections ...")
df_fulltime = df_fulltime[df_fulltime["id"] != 5573]
df_fulltime = df_fulltime[df_fulltime["id"] != 8747]
df_fulltime.loc[df_fulltime["id"] == 17102, "Salary"] = round(105000 * 0.72)
df_fulltime.loc[df_fulltime["id"] == 17102, "Salary Unit"] = "year"
df_fulltime.loc[df_fulltime["id"] == 17102, "Annual Bonus"] = str(round(8000 * 0.72))
df_fulltime.loc[df_fulltime["id"] == 4576, "Annual Bonus"] = str(round(25000 * 1.08))
df_fulltime.loc[df_fulltime["id"] == 3825, "Annual Bonus"] = str(round(2000 * 1.08))

df_fulltime["Annual Bonus"] = (
    df_fulltime["Annual Bonus"].str.replace(r"[^0-9]", "", regex=True)
)
# guard: blank strings (a bonus with no digits) -> NaN instead of crashing astype
df_fulltime["Annual Bonus"] = df_fulltime["Annual Bonus"].replace("", pd.NA)
df_fulltime["Annual Bonus"] = df_fulltime["Annual Bonus"].astype(float)

units = set(df_fulltime["Salary Unit"].unique())
print(f"  salary units present before correction: {sorted(units)}")
df_fulltime.loc[df_fulltime["Salary Unit"] == "CADyear", "Salary"] = round(
    df_fulltime.loc[df_fulltime["Salary Unit"] == "CADyear", "Salary"] * 0.72
)
df_fulltime.loc[df_fulltime["Salary Unit"] == "CADyear", "Salary Unit"] = "year"
df_fulltime.loc[df_fulltime["Salary Unit"] == "localcurrencyyear", "Salary Unit"] = "year"
df_fulltime = df_fulltime[df_fulltime["id"] != 3616]  # CHF entry, bad

remaining_units = set(df_fulltime["Salary Unit"].unique())
unexpected = remaining_units - {"year", "hour"}
if unexpected:
    print(
        f"  WARNING: unexpected salary unit(s) still present: {sorted(unexpected)} "
        f"(notebook only ever saw year/hour). Dropping those rows."
    )
    df_fulltime = df_fulltime[df_fulltime["Salary Unit"].isin(["year", "hour"])]
print(f"  salary units after correction: {sorted(df_fulltime['Salary Unit'].unique())}")

print("6/6  Inflation adjustment ...")
df_cpi = pd.read_csv("CPIAUCSL.csv")
df_cpi["DATE"] = pd.to_datetime(df_cpi["DATE"])
df_cpi = df_cpi.sort_values("DATE").reset_index(drop=True)

# FRED sometimes carries a dated row with a blank value (e.g. the Oct-2025
# observation was never published due to the BLS shutdown). Linearly
# interpolate any such interior gaps from the neighbouring months rather
# than substituting the latest CPI (which would mis-state inflation for
# those survey months). This generalises the notebook's hardcoded patch.
interior_gaps = df_cpi[df_cpi["CPIAUCSL"].isna()]
if not interior_gaps.empty:
    df_cpi["CPIAUCSL"] = df_cpi["CPIAUCSL"].interpolate(method="linear")
    for _, g in interior_gaps.iterrows():
        filled = df_cpi.loc[df_cpi["DATE"] == g["DATE"], "CPIAUCSL"].iloc[0]
        print(
            f"  interpolated missing CPI for {g['DATE'].date()} -> {filled:.3f}"
        )

# "Today" baseline = latest month that actually has a (real or interpolated) value.
latest_cpi_date = df_cpi.loc[df_cpi["CPIAUCSL"].notna(), "DATE"].max()
current_cpi = df_cpi.loc[df_cpi["DATE"] == latest_cpi_date, "CPIAUCSL"].iloc[0]
print(
    f"  latest CPI: {latest_cpi_date.date()} = {current_cpi} "
    f"(used as 'today' baseline)"
)

df_fulltime = pd.merge(
    df_fulltime, df_cpi, left_on="Date", right_on="DATE", how="left"
)
df_fulltime.drop(columns=["DATE"], inplace=True)

# Any survey month newer than the latest CPI release (the most recent 1-2
# months, which BLS hasn't published yet) takes the latest CPI value.
missing_cpi = df_fulltime["CPIAUCSL"].isna()
if missing_cpi.any():
    months = sorted(df_fulltime.loc[missing_cpi, "Date"].dt.strftime("%Y-%m").unique())
    print(f"  forward-filling latest CPI for future survey month(s): {months}")
    df_fulltime.loc[missing_cpi, "CPIAUCSL"] = current_cpi
assert df_fulltime["CPIAUCSL"].isna().sum() == 0

df_fulltime["Inflation Adjusted Salary"] = df_fulltime["Salary"] * (
    current_cpi / df_fulltime["CPIAUCSL"]
)
df_fulltime["Inflation Adjusted Salary"] = (
    df_fulltime["Inflation Adjusted Salary"].round(-2)
)

df_fulltime.to_csv(FULLTIME_OUT, index=False)
print(f"\nDONE")
print(f"  {RAW_OUT}        rows={raw_rows}")
print(f"  {FULLTIME_OUT}   shape={df_fulltime.shape}")
print(f"  columns: {list(df_fulltime.columns)}")
