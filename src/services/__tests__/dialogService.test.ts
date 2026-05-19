import { extractSingleConversation, extractArrangementFromText } from "../dialogService";
import { requestChatCompletion } from "../aiService";

// Mock the AI service module
jest.mock("../aiService", () => ({
  requestChatCompletion: jest.fn(),
}));

describe("dialogService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("extractSingleConversation", () => {
    it("should successfully extract a SingleConversation from valid JSON response", async () => {
      const mockResult = {
        uid: "conv-12345",
        title: "Meeting Schedule",
        messages: [
          { role: "user", content: "Let's meet tomorrow at 3pm." },
          { role: "assistant", content: "Got it, meeting scheduled for tomorrow 3pm." }
        ],
        metadata: {
          extractedAt: 1716100000,
          summary: "User and assistant discussed meeting time."
        }
      };

      (requestChatCompletion as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockResult));

      const result = await extractSingleConversation("Let's meet tomorrow at 3pm.");
      expect(result).toEqual(mockResult);
      expect(requestChatCompletion).toHaveBeenCalledTimes(1);
    });

    it("should throw an error when API returns invalid JSON", async () => {
      (requestChatCompletion as jest.Mock).mockResolvedValueOnce("Invalid plain text response");

      await expect(extractSingleConversation("Hello")).rejects.toThrow(
        "API Error: Response is not valid JSON"
      );
    });

    it("should throw an error when API response lacks required schema fields", async () => {
      const invalidResult = {
        title: "Missing fields"
      };

      (requestChatCompletion as jest.Mock).mockResolvedValueOnce(JSON.stringify(invalidResult));

      await expect(extractSingleConversation("Hello")).rejects.toThrow(
        "API Error: Parsed object does not conform to SingleConversation schema"
      );
    });
  });

  describe("extractArrangementFromText", () => {
    it("should extract arrangement correctly when it exists", async () => {
      const mockArrangement = {
        hasArrangement: true,
        text: "去医院"
      };

      (requestChatCompletion as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockArrangement));

      const result = await extractArrangementFromText("后天去一趟医院");
      expect(result).toEqual(mockArrangement);
    });

    it("should return hasArrangement: false when none exists", async () => {
      const mockArrangement = {
        hasArrangement: false,
        text: ""
      };

      (requestChatCompletion as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockArrangement));

      const result = await extractArrangementFromText("今天天气真好");
      expect(result).toEqual(mockArrangement);
    });

    it("should handle error gracefully and return null on invalid JSON", async () => {
      (requestChatCompletion as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

      const result = await extractArrangementFromText("Error message");
      expect(result).toBeNull();
    });
  });
});
