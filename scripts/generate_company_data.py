"""
Generate comprehensive company data by parsing internships.json
Creates companies.json with detailed company profiles and their associated internships.
"""

import json
import random
from collections import defaultdict
from datetime import datetime

# Company information templates based on sectors
COMPANY_INFO = {
    "Technology": {
        "founded_range": (1995, 2020),
        "employee_ranges": ["100-500", "500-1000", "1000-5000", "5000+"],
        "specializations": ["Cloud Computing", "AI/ML", "Software Development", "Cybersecurity", "Big Data"],
        "benefits": ["Health Insurance", "Flexible Work Hours", "Learning & Development Budget", "Remote Work Options", "Team Outings"],
    },
    "E-commerce": {
        "founded_range": (2005, 2020),
        "employee_ranges": ["500-1000", "1000-5000", "5000+"],
        "specializations": ["Logistics", "Supply Chain", "Customer Experience", "Digital Payments", "Marketplace"],
        "benefits": ["Employee Discounts", "Health Insurance", "Performance Bonuses", "Career Growth Programs", "Flexible Work"],
    },
    "Finance": {
        "founded_range": (1990, 2018),
        "employee_ranges": ["100-500", "500-1000", "1000-5000"],
        "specializations": ["Digital Banking", "Payment Solutions", "Financial Analytics", "Risk Management", "Blockchain"],
        "benefits": ["Health Insurance", "Retirement Benefits", "Performance Bonuses", "Learning Programs", "Stock Options"],
    },
    "Healthcare": {
        "founded_range": (2000, 2020),
        "employee_ranges": ["100-500", "500-1000", "1000-5000"],
        "specializations": ["Telemedicine", "Healthcare IT", "Medical Devices", "Health Analytics", "Pharmaceutical"],
        "benefits": ["Health Insurance", "Medical Coverage", "Work-Life Balance", "Professional Development", "Wellness Programs"],
    },
    "Consulting": {
        "founded_range": (1980, 2015),
        "employee_ranges": ["500-1000", "1000-5000", "5000+"],
        "specializations": ["Strategy Consulting", "Technology Consulting", "Digital Transformation", "Analytics", "Operations"],
        "benefits": ["Travel Allowances", "Health Insurance", "Career Development", "Global Exposure", "Performance Bonuses"],
    },
    "Education": {
        "founded_range": (2010, 2022),
        "employee_ranges": ["50-200", "200-500", "500-1000"],
        "specializations": ["EdTech", "Online Learning", "Skill Development", "K-12 Education", "Professional Training"],
        "benefits": ["Learning Credits", "Flexible Hours", "Health Insurance", "Remote Work", "Professional Growth"],
    },
    "Media & Entertainment": {
        "founded_range": (2005, 2020),
        "employee_ranges": ["200-500", "500-1000", "1000-5000"],
        "specializations": ["Streaming", "Content Creation", "Digital Media", "Gaming", "Social Media"],
        "benefits": ["Creative Freedom", "Health Insurance", "Flexible Work", "Entertainment Perks", "Team Events"],
    },
    "Automotive": {
        "founded_range": (1985, 2018),
        "employee_ranges": ["500-1000", "1000-5000", "5000+"],
        "specializations": ["Electric Vehicles", "Autonomous Driving", "Connected Cars", "Manufacturing", "Mobility Solutions"],
        "benefits": ["Health Insurance", "Transportation Allowance", "Performance Bonuses", "Training Programs", "Innovation Labs"],
    },
    "Retail": {
        "founded_range": (1995, 2020),
        "employee_ranges": ["500-1000", "1000-5000", "5000+"],
        "specializations": ["Omnichannel Retail", "Supply Chain", "Customer Analytics", "Store Operations", "E-commerce"],
        "benefits": ["Employee Discounts", "Health Insurance", "Flexible Scheduling", "Career Development", "Performance Bonuses"],
    },
    "Food & Beverage": {
        "founded_range": (2010, 2022),
        "employee_ranges": ["200-500", "500-1000", "1000-5000"],
        "specializations": ["Food Delivery", "Cloud Kitchens", "Restaurant Tech", "Supply Chain", "Customer Experience"],
        "benefits": ["Food Allowances", "Health Insurance", "Flexible Hours", "Growth Opportunities", "Team Meals"],
    }
}

# Company culture keywords by sector
CULTURE_KEYWORDS = {
    "Technology": ["Innovation-driven", "Fast-paced", "Collaborative", "Learning-focused", "Agile"],
    "E-commerce": ["Customer-centric", "Data-driven", "Dynamic", "Growth-oriented", "Innovative"],
    "Finance": ["Professional", "Integrity-focused", "Performance-driven", "Analytical", "Secure"],
    "Healthcare": ["Patient-first", "Ethical", "Research-oriented", "Compassionate", "Innovative"],
    "Consulting": ["Excellence-driven", "Collaborative", "Global mindset", "Analytical", "Client-focused"],
    "Education": ["Learning-focused", "Inclusive", "Mission-driven", "Innovative", "Supportive"],
    "Media & Entertainment": ["Creative", "Dynamic", "Trend-setting", "Collaborative", "Audience-first"],
    "Automotive": ["Engineering excellence", "Innovation-driven", "Quality-focused", "Sustainable", "Tech-forward"],
    "Retail": ["Customer-centric", "Service-oriented", "Dynamic", "Community-focused", "Efficient"],
    "Food & Beverage": ["Quality-focused", "Customer-first", "Fast-paced", "Innovative", "Service-oriented"]
}

def get_company_headquarters(organization, sector):
    """Determine headquarters based on common patterns"""
    tech_hubs = ["Bangalore", "Hyderabad", "Pune", "Gurgaon", "Mumbai"]
    
    if "India" in organization:
        return random.choice(tech_hubs)
    
    # Map some well-known companies
    hq_map = {
        "Google": "Mountain View, USA",
        "Microsoft": "Redmond, USA",
        "Amazon": "Seattle, USA",
        "Flipkart": "Bangalore, India",
        "Swiggy": "Bangalore, India",
        "Zomato": "Gurgaon, India",
        "PhonePe": "Bangalore, India",
        "Razorpay": "Bangalore, India",
        "CRED": "Bangalore, India",
        "Paytm": "Noida, India",
        "Ola": "Bangalore, India",
        "Uber": "San Francisco, USA",
        "Netflix": "Los Gatos, USA",
        "Adobe": "San Jose, USA",
        "Accenture": "Dublin, Ireland",
        "Deloitte": "London, UK",
        "McKinsey": "New York, USA",
        "BCG": "Boston, USA",
    }
    
    for key, hq in hq_map.items():
        if key in organization:
            return hq
    
    return random.choice(tech_hubs + [", India"])

def get_company_website(organization):
    """Generate a realistic website URL"""
    # Clean up organization name
    name = organization.lower()
    name = name.replace(" india", "").replace(" labs", "").replace(" ", "")
    name = name.replace("&", "and").replace("'", "")
    return f"https://www.{name}.com"

def get_company_logo_url(organization):
    """Generate a placeholder logo URL"""
    # Use UI Avatars for placeholder logos
    name = organization.replace(" ", "+")
    return f"https://ui-avatars.com/api/?name={name}&size=200&background=random&bold=true"

def generate_company_description(organization, sector, specializations):
    """Generate a realistic company description"""
    templates = {
        "Technology": [
            f"{organization} is a leading technology company specializing in {', '.join(specializations[:2])}. We're committed to building innovative solutions that transform how businesses operate in the digital age.",
            f"At {organization}, we leverage cutting-edge technology in {specializations[0]} and {specializations[1]} to create products that impact millions of users worldwide. Our team of experts drives innovation across the tech landscape.",
        ],
        "E-commerce": [
            f"{organization} is revolutionizing online commerce with a focus on {', '.join(specializations[:2])}. We connect millions of customers with products and services they love.",
            f"As a pioneer in e-commerce, {organization} combines technology and logistics excellence to deliver seamless shopping experiences. Our expertise in {specializations[0]} sets us apart.",
        ],
        "Finance": [
            f"{organization} is transforming financial services through {', '.join(specializations[:2])}. We empower individuals and businesses with secure, innovative financial solutions.",
            f"At {organization}, we're building the future of finance with advanced {specializations[0]} and {specializations[1]} capabilities. Trust and innovation are at our core.",
        ],
        "Healthcare": [
            f"{organization} is dedicated to improving healthcare through {', '.join(specializations[:2])}. We combine medical expertise with technology to deliver better patient outcomes.",
            f"As a healthcare innovator, {organization} leverages {specializations[0]} to make quality healthcare accessible to all. Our mission is to transform patient care.",
        ],
        "Consulting": [
            f"{organization} is a global consulting leader specializing in {', '.join(specializations[:2])}. We partner with organizations to solve their most complex challenges.",
            f"At {organization}, our expertise in {specializations[0]} and {specializations[1]} helps clients achieve sustainable growth and transformation.",
        ],
        "Education": [
            f"{organization} is revolutionizing education through {', '.join(specializations[:2])}. We make quality learning accessible and engaging for learners worldwide.",
            f"As an EdTech pioneer, {organization} combines pedagogy with technology to create transformative learning experiences in {specializations[0]}.",
        ],
        "Media & Entertainment": [
            f"{organization} is a leading media company focused on {', '.join(specializations[:2])}. We create and deliver content that entertains and inspires millions.",
            f"At {organization}, we're redefining entertainment through {specializations[0]} and {specializations[1]}, bringing stories to life across platforms.",
        ],
        "Automotive": [
            f"{organization} is driving the future of mobility with innovations in {', '.join(specializations[:2])}. We're committed to sustainable and smart transportation.",
            f"As an automotive leader, {organization} combines engineering excellence with {specializations[0]} to create the vehicles of tomorrow.",
        ],
        "Retail": [
            f"{organization} is transforming retail with a focus on {', '.join(specializations[:2])}. We deliver exceptional shopping experiences across all channels.",
            f"At {organization}, our expertise in {specializations[0]} and customer service creates value for shoppers and communities.",
        ],
        "Food & Beverage": [
            f"{organization} is revolutionizing food services through {', '.join(specializations[:2])}. We connect customers with quality food experiences.",
            f"As a leader in food tech, {organization} leverages {specializations[0]} to deliver delightful dining experiences at scale.",
        ]
    }
    
    sector_templates = templates.get(sector, templates["Technology"])
    return random.choice(sector_templates)

def generate_company_data(internships_file, output_file):
    """Generate comprehensive company data from internships"""
    
    print(f"Loading internships from {internships_file}...")
    with open(internships_file, 'r', encoding='utf-8') as f:
        internships = json.load(f)
    
    print(f"Found {len(internships)} internships")
    
    # Group internships by organization
    company_internships = defaultdict(list)
    company_sectors = {}
    company_locations = defaultdict(set)
    
    for internship in internships:
        org = internship['organization']
        company_internships[org].append(internship['internship_id'])
        company_sectors[org] = internship['sector']
        company_locations[org].add(internship['location'])
    
    print(f"Found {len(company_internships)} unique companies")
    
    # Generate company profiles
    companies = []
    
    for idx, (org, internship_ids) in enumerate(sorted(company_internships.items()), start=1):
        sector = company_sectors[org]
        sector_info = COMPANY_INFO.get(sector, COMPANY_INFO["Technology"])
        
        # Generate company ID
        company_id = f"COMP_{idx:03d}"
        
        # Get random specializations
        specializations = random.sample(sector_info["specializations"], min(3, len(sector_info["specializations"])))
        
        # Get random benefits
        benefits = random.sample(sector_info["benefits"], min(4, len(sector_info["benefits"])))
        
        # Get culture keywords
        culture = random.sample(CULTURE_KEYWORDS.get(sector, CULTURE_KEYWORDS["Technology"]), min(3, len(CULTURE_KEYWORDS.get(sector, []))))
        
        company = {
            "company_id": company_id,
            "name": org,
            "sector": sector,
            "description": generate_company_description(org, sector, specializations),
            "headquarters": get_company_headquarters(org, sector),
            "founded_year": random.randint(*sector_info["founded_range"]),
            "employee_count": random.choice(sector_info["employee_ranges"]),
            "website": get_company_website(org),
            "logo_url": get_company_logo_url(org),
            "locations": sorted(list(company_locations[org])),
            "specializations": specializations,
            "culture": culture,
            "benefits": benefits,
            "internship_ids": sorted(internship_ids),
            "total_internships": len(internship_ids),
            "is_hiring": random.choice([True, True, True, False]),  # 75% are actively hiring
            "rating": round(random.uniform(3.5, 4.9), 1),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        companies.append(company)
        print(f"Generated profile for {org} ({len(internship_ids)} internships)")
    
    # Sort by total_internships descending, then by name
    companies.sort(key=lambda x: (-x['total_internships'], x['name']))
    
    # Save to file
    print(f"\nSaving {len(companies)} companies to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(companies, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Company data generation complete!")
    print(f"\nTop 10 companies by internship count:")
    for company in companies[:10]:
        print(f"  - {company['name']}: {company['total_internships']} internships")
    
    return companies

if __name__ == "__main__":
    internships_file = "data/internships.json"
    output_file = "data/companies.json"
    
    companies = generate_company_data(internships_file, output_file)
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total Companies: {len(companies)}")
    print(f"  Sectors: {len(set(c['sector'] for c in companies))}")
    print(f"  Average Internships per Company: {sum(c['total_internships'] for c in companies) / len(companies):.1f}")
    print(f"{'='*60}")
