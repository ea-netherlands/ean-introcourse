import fs from "fs";
import path from "path";
import matter from "gray-matter";

const MODULES_DIR = path.join(process.cwd(), "content", "modules");

export interface ModuleFrontmatter {
  title: string;
  week?: number;
  description?: string;
  estimatedMinutes?: number;
  exercises?: Array<{
    key: string;
    question: string;
    type: "textarea" | "text" | "radio" | "checkbox";
    options?: string[];
    required?: boolean;
  }>;
}

export interface ModuleListItem {
  slug: string;
  title: string;
  orderIndex: number;
}

export interface ModuleData {
  slug: string;
  frontmatter: ModuleFrontmatter;
  content: string;
}

/** Return all modules sorted by their order_index frontmatter field (or filename order). */
export async function getModuleList(): Promise<ModuleListItem[]> {
  if (!fs.existsSync(MODULES_DIR)) return [];

  const files = fs
    .readdirSync(MODULES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .sort();

  return files.map((file, i) => {
    const slug = file.replace(/\.(mdx?|md)$/, "");
    const raw = fs.readFileSync(path.join(MODULES_DIR, file), "utf-8");
    const { data } = matter(raw);
    return {
      slug,
      title: (data as ModuleFrontmatter).title ?? slug,
      orderIndex: (data as ModuleFrontmatter).week ?? i + 1,
    };
  });
}

/** Read and parse a single module by slug. Returns null if not found. */
export async function getModule(slug: string): Promise<ModuleData | null> {
  const candidates = [`${slug}.mdx`, `${slug}.md`];
  for (const candidate of candidates) {
    const filePath = path.join(MODULES_DIR, candidate);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      return {
        slug,
        frontmatter: data as ModuleFrontmatter,
        content,
      };
    }
  }
  return null;
}
