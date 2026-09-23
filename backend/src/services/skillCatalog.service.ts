import { pool } from "../config/database";
import type { SkillCatalogItem } from "../types/skill.types";

interface SkillCatalogDbRow {
  id: string;
  name: string;
  category: string;
  icon_key: string | null;
  created_at: Date;
}

function mapRowToCatalogItem(row: SkillCatalogDbRow): SkillCatalogItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    iconKey: row.icon_key,
    createdAt: row.created_at,
  };
}

export class SkillCatalogService {
  /**
   * Retrieves global predefined skills from skill_catalog.
   * Supports optional case-insensitive search and category filters.
   * Results are ordered by category ASC, name ASC.
   */
  async getSkillCatalog(
    search?: string,
    category?: string
  ): Promise<SkillCatalogItem[]> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    const trimmedCategory = category?.trim();
    if (trimmedCategory) {
      values.push(trimmedCategory);
      conditions.push(`LOWER(category) = LOWER($${values.length})`);
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      values.push(`%${trimmedSearch}%`);
      conditions.push(`name ILIKE $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT id, name, category, icon_key, created_at
      FROM skill_catalog
      ${whereClause}
      ORDER BY category ASC, name ASC
    `;

    const result = await pool.query<SkillCatalogDbRow>(query, values);
    return result.rows.map(mapRowToCatalogItem);
  }
}

export const skillCatalogService = new SkillCatalogService();
