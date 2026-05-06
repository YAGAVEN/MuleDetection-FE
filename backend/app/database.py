"""Database configuration and Supabase connection"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase_client: Client = None


def init_supabase() -> Client:
    """Initialize Supabase client"""
    global supabase_client
    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY or SUPABASE_KEY)
    return supabase_client


def get_supabase() -> Client:
    """Get Supabase client"""
    if supabase_client is None:
        init_supabase()
    return supabase_client


class SupabaseService:
    """Supabase database service wrapper"""

    def __init__(self):
        self.client = get_supabase()

    def query(self, table: str, select: str = "*", filters: dict = None):
        """Query a table"""
        query = self.client.table(table).select(select)
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        return query.execute()

    def insert(self, table: str, data: dict):
        """Insert a record"""
        return self.client.table(table).insert(data).execute()

    def upsert(self, table: str, data: dict, on_conflict: str = None):
        """Upsert a record"""
        return self.client.table(table).upsert(data).execute()

    def update(self, table: str, data: dict, filters: dict):
        """Update records"""
        query = self.client.table(table).update(data)
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()

    def delete(self, table: str, filters: dict):
        """Delete records"""
        query = self.client.table(table).delete()
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()

    def get_by_id(self, table: str, id_field: str, id_value: str):
        """Get a single record by ID"""
        return self.client.table(table).select("*").eq(id_field, id_value).execute()

    def get_all(self, table: str, limit: int = 100):
        """Get all records with limit"""
        return self.client.table(table).select("*").limit(limit).execute()


# Global service instance
db_service: SupabaseService = None


def get_db_service() -> SupabaseService:
    """Get database service instance"""
    global db_service
    if db_service is None:
        db_service = SupabaseService()
    return db_service
