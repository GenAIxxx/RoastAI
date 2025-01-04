import { Client as QdrantClient } from "@qdrant/js-client-rest";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const COLLECTION_NAME = "agent-collection";
const VECTOR_DIMENSIONS = 1536;

interface Word {
  id: string;
  definition: string;
  embedding?: number[];
}

interface QueryResult {
  id: string;
  score: number;
  payload: any;
}

class AIModel {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint = "https://api.openai.com/v1/embeddings") {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await axios.post(
      this.apiEndpoint,
      { input: text, model: "text-embedding-ada-002" },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return response.data.data[0].embedding;
  }
}

class Agent {
  private qdrant: QdrantClient;
  private model: AIModel;

  constructor(qdrantUrl: string, openAiKey: string) {
    this.qdrant = new QdrantClient({ url: qdrantUrl });
    this.model = new AIModel(openAiKey);
  }

  async initializeCollection(): Promise<void> {
    const existingCollections = await this.qdrant.getCollections();
    if (!existingCollections.collections.some((col) => col.name === COLLECTION_NAME)) {
      await this.qdrant.createCollection({
        collection_name: COLLECTION_NAME,
        vectors: { size: VECTOR_DIMENSIONS, distance: "Cosine" },
      });
      console.log(`Collection ${COLLECTION_NAME} initialized.`);
    }
  }

  async createPoints(words: Word[]): Promise<void> {
    const points = await Promise.all(
      words.map(async (word) => {
        const embedding = await this.model.generateEmbedding(word.definition);
        return {
          id: word.id,
          vector: embedding,
          payload: { definition: word.definition },
        };
      })
    );

    await this.qdrant.upsert(COLLECTION_NAME, { points });
    console.log("Points added to collection.");
  }

  async search(query: string, topN: number): Promise<QueryResult[]> {
    const queryVector = await this.model.generateEmbedding(query);
    const results = await this.qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: topN,
      with_payload: true,
    });
    return results.map((res) => ({
      id: res.id,
      score: res.score,
      payload: res.payload,
    }));
  }
}

// Usage Example
(async () => {
  const agent = new Agent("http://localhost:6333", process.env.OPENAI_API_KEY || "");

  await agent.initializeCollection();

  const words: Word[] = [
    {
      id: uuidv4(),
      definition: "Definition of a *flurbo*: A green alien that lives on cold planets.",
    },
    {
      id: uuidv4(),
      definition: "Definition of a *glarb-glarb*: An ancient tool used for farming by ancestors of planet Jiro.",
    },
    {
      id: uuidv4(),
      definition: "Definition of a *linglingdong*: A term used to describe humans by moon inhabitants.",
    },
  ];

  await agent.createPoints(words);

  const results = await agent.search("What is a linglingdong?", 1);
  console.log("Search Results:", results);
})();
