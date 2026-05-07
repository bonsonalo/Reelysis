from sqlmodel import SQLModel, Field, Column, Relationship, ForeignKey
from uuid import UUID, uuid4
from datetime import datetime
import sqlalchemy.dialects.postgresql as pg





class CompetitorAccount(SQLModel, table= True):
    __tablename__= "competitor_accounts"


    id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            primary_key= True,
            server_default= uuid4
        )
    )
    
    user_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("users.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    provider: str= Field(
        default= "brightdata"
    )
    handle: str
    display_name: str
    followers_count: int
    media_count: int
    niche_tags: pg.JSONB
    engagement_rank: int
    source_metadata: pg.JSONB   
    last_synced_at: datetime




    user: "User"= Relationship(
        back_populates= "competitor_account"
    )