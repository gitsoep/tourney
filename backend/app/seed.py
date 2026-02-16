"""
Seed script: creates an admin user and sample players.
Run: python -m app.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.player import Player

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        # Admin user
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@darttournament.com",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_approved=True,
            )
            db.add(admin)
            print("Created admin user (admin / admin123)")

        # Sample players
        sample_players = [
            ("Michael van Gerwen", "Mighty Mike", "mvg@darts.com"),
            ("Peter Wright", "Snakebite", "pw@darts.com"),
            ("Gerwyn Price", "The Iceman", "gp@darts.com"),
            ("Gary Anderson", "The Flying Scotsman", "ga@darts.com"),
            ("Rob Cross", "Voltage", "rc@darts.com"),
            ("James Wade", "The Machine", "jw@darts.com"),
            ("Dave Chisnall", "Chizzy", "dc@darts.com"),
            ("Jonny Clayton", "The Ferret", "jc@darts.com"),
            ("Michael Smith", "Bully Boy", "ms@darts.com"),
            ("Nathan Aspinall", "The Asp", "na@darts.com"),
            ("Dimitri Van den Bergh", "The DreamMaker", "dvdb@darts.com"),
            ("Joe Cullen", "The Rockstar", "jcu@darts.com"),
            ("Danny Noppert", "The Freeze", "dn@darts.com"),
            ("Dirk van Duijvenbode", "The Titan", "dvd@darts.com"),
            ("Luke Humphries", "Cool Hand Luke", "lh@darts.com"),
            ("Josh Rock", "Rocky", "jr@darts.com"),
        ]

        for name, nick, email in sample_players:
            if not db.query(Player).filter(Player.name == name).first():
                db.add(Player(name=name, nickname=nick, email=email))

        db.commit()
        print(f"Seeded {len(sample_players)} sample players")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed complete!")
