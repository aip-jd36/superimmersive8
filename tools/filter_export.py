import csv

# "AD" title at these companies = financial analyst, not Art Director
analyst_companies = [
    'barclays capital', 'barcap', 'bear stearns', 'abn amro', 'macquarie',
    'rbs financial markets', 'kpmg corporate finance', 'gi partners', 'ibd',
    'zolfo cooper', 'arbuthnot', 'fitch', 'barclays', 'fo',
]

# Titles that are clearly not creative/marketing roles
cut_titles_exact = {
    'senior captive underwriter',
    'divisional director - fine art & specie',
    'director, specie & fine art',
    'case handler',
    'actuarial consultant',
    'assistant branch service manager',
    'trade surveillance ad',
    'trade suveillance ad',
    'senior manager, portfolio risk management group - eca',
    'personal banker',
    'accounts payable ad',
    'director - fine art & specie',
    'head of fine art and numismatics',
    'director fine art and specie',
    'director fine art',
    'vice president, principal sales emea',
    'head of market data & analytics',
    'director, pathway programme',
    'member board of directors',
    'senior engineering manager',
    'insurance broker',
    'mortgage ad',
    'financial services ad',
    'case ad',
    'hospitality specialist',
    'interim chief medical officer',
    'massive ad',
    'private investor ',
    'customer experience ad',
    'customer service specialist',
    'senior product designer',
    'marketing copywriter',
    'it  - ad',
    'it-ad',
}

# Off-sector companies — substrings to match
cut_companies_substr = [
    "wag! group", "konoki farms", "uk flower power", "tallulah o",
    "edeniste parfum", "the reform collection", "yp bakes", "manga inventories",
    "vcl vintners", "katkin", "extempore theatre", "vape lab global",
    "fle clothing", "lsesu rag", "the afrodeities", "west mercia women",
    "delight entertainment", "little cloud bahamas", "bigkid treehouse",
    "made by alkemi", "healthy horizons", "14 kingsley court",
    "itsinternaltional", "poolify", "craft & narrative", "real new york tours",
    "combat feed media", "zaz natural healing", "travesura events",
    "nobi studios", "superfly group", "mitie", "africa and the diaspora",
    "grand mayumba", "greycoat lumleys", "western power", "coh property",
    "smith-wright", "smithwright",
]

cut_names_lower = set()  # Not using name-based cuts — title + company filters are sufficient

seen_urls = set()
seen_names = set()
rows_out = []

with open('C:/Users/User/Downloads/export.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        first = row.get('First name', '').strip()
        last = row.get('Last name', '').strip()
        title = row.get('Title', '').strip()
        company = row.get('Company', '').strip()
        location = row.get('Location', '').strip()
        pub_url = row.get('Linkedin public url', '').strip() or row.get('Linkedin url', '').strip()
        city = row.get('City', '').strip()
        country = row.get('Country', '').strip()

        full_name = (first + ' ' + last).strip()
        full_name_lower = full_name.lower()
        title_lower = title.lower()
        company_lower = company.lower()

        if not first and not last:
            continue

        # Dedup
        dedup_key = pub_url if pub_url else full_name_lower
        if dedup_key in seen_urls:
            continue
        seen_urls.add(dedup_key)

        # Cut: blank title
        if not title:
            continue

        # Cut: AD titles at analyst firms
        if title_lower == 'ad':
            if any(ac in company_lower for ac in analyst_companies):
                continue

        # Cut: specific non-creative titles
        if title_lower in cut_titles_exact:
            continue

        # Cut: off-sector companies
        if any(substr in company_lower for substr in cut_companies_substr):
            continue

        # Cut: known non-ICP people by name
        if full_name_lower in cut_names_lower:
            continue

        # Build location string
        loc = city if city else location
        if country and country not in loc:
            loc = (loc + ', ' + country).strip(', ') if loc else country

        rows_out.append({
            'Name': full_name,
            'Company': company,
            'Title': title,
            'Location': loc,
            'LinkedIn URL': pub_url,
        })

with open('C:/Users/User/Downloads/export-filtered.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['Name', 'Company', 'Title', 'Location', 'LinkedIn URL'])
    writer.writeheader()
    writer.writerows(rows_out)

print(f'Done — {len(rows_out)} leads written to export-filtered.csv')
