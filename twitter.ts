import axios from "axios";
import * as dotenv from "dotenv";
import { EventEmitter } from "events";
import crypto from "crypto";

dotenv.config();

class TwitterAgent {
  private apiBaseUrl: string;
  private bearerToken: string;
  private eventEmitter: EventEmitter;

  constructor() {
    this.apiBaseUrl = "https://api.twitter.com/2";
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || "";
    this.eventEmitter = new EventEmitter();
  }

  // Fetch Tweets based on a query
  async fetchTweets(query: string, maxResults: number = 10): Promise<any> {
    const url = `${this.apiBaseUrl}/tweets/search/recent`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
        params: { query, max_results: maxResults },
      });
      this.emitEvent("fetchTweets", query);
      return response.data;
    } catch (error) {
      console.error("[TwitterAgent] Error fetching tweets:", error);
      throw new Error("Failed to fetch tweets.");
    }
  }

  // Generate a hashed analysis report of the tweet
  analyzeTweet(content: string): string {
    const hash = crypto.createHash("sha256");
    hash.update(content);
    const analysisId = hash.digest("hex").slice(0, 16);
    const wordCount = content.split(" ").length;
    return `AnalysisID: ${analysisId}, Word Count: ${wordCount}`;
  }

  // Post a tweet
  async postTweet(content: string): Promise<any> {
    const url = `${this.apiBaseUrl}/tweets`;
    try {
      const response = await axios.post(
        url,
        { text: content },
        { headers: { Authorization: `Bearer ${this.bearerToken}` } }
      );
      this.emitEvent("postTweet", content);
      return response.data;
    } catch (error) {
      console.error("[TwitterAgent] Error posting tweet:", error);
      throw new Error("Failed to post tweet.");
    }
  }

  // Emit internal events
  private emitEvent(eventName: string, data: any): void {
    this.eventEmitter.emit(eventName, data);
    console.log(`[TwitterAgent] Event emitted: ${eventName}`);
  }

  // Listen to events
  onEvent(eventName: string, callback: (data: any) => void): void {
    this.eventEmitter.on(eventName, callback);
  }
}

// Usage Example
(async () => {
  const twitterAgent = new TwitterAgent();

  twitterAgent.onEvent("fetchTweets", (data) =>
    console.log("[Event] Fetched Tweets with Query:", data)
  );
  twitterAgent.onEvent("postTweet", (data) =>
    console.log("[Event] Tweet Posted:", data)
  );

  // Fetch and analyze tweets
  const tweets = await twitterAgent.fetchTweets("AI trends");
  console.log("Fetched Tweets:", tweets);

  if (tweets.data) {
    for (const tweet of tweets.data) {
      console.log(twitterAgent.analyzeTweet(tweet.text));
    }
  }

  // Post a sample tweet
  const newTweet = await twitterAgent.postTweet("Exploring AI-powered Twitter integrations 🚀");
  console.log("Posted Tweet:", newTweet);
})();
