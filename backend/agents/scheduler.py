
import argparse
import logging

from apscheduler.schedulers.blocking import BlockingScheduler

from agents.research_agent import research_company


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# Temporary company assignments.
# Later, these will come from Supabase.
COMPANIES = [
    {
        "company": "Nakilat",
        "sector": "LNG Shipping",
        "description": (
            "Qatari company that transports "
            "liquefied natural gas using ships."
        ),
        "interval_hours": 6
    },
    {
        "company": "QNB",
        "sector": "Banking",
        "description": (
            "Qatari bank offering financial "
            "services to people and businesses."
        ),
        "interval_hours": 12
    }
]


def run_research(company):
    """
    Run one company's research task.
    """

    name = company["company"]

    logger.info("Starting research for %s", name)

    try:
        report = research_company(
            company=name,
            sector=company["sector"],
            description=company["description"]
        )

        logger.info(
            "Research finished for %s: %s",
            name,
            report["status"]
        )

        logger.info(
            "Generated %d insights",
            len(report["insights"])
        )

        # Later: save the report to Supabase.
        return report

    except Exception:
        logger.exception(
            "Research failed for %s", name
        )
        return None


def create_scheduler():
    """
    Register research jobs for all companies.
    """

    scheduler = BlockingScheduler(timezone="UTC")

    for company in COMPANIES:
        scheduler.add_job(
            func=run_research,
            trigger="interval",
            hours=company["interval_hours"],
            args=[company],
            id=f"research_{company['company']}",
            name=f"Research {company['company']}",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=300
        )

    return scheduler


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--list",
        action="store_true",
        help="List configured research jobs"
    )

    parser.add_argument(
        "--once",
        action="store_true",
        help="Run all research jobs immediately"
    )

    args = parser.parse_args()

    if args.list:
        for company in COMPANIES:
            print(
                f"{company['company']}: "
                f"every {company['interval_hours']} hours"
            )
        return

    if args.once:
        for company in COMPANIES:
            run_research(company)
        return

    scheduler = create_scheduler()

    logger.info("NUMU research scheduler started")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("NUMU scheduler stopped")


if __name__ == "__main__":
    main()
