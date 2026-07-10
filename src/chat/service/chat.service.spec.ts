import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "./chat.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("ChatService", () => {
  let service: ChatService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrCreateConversation", () => {
    it("should throw BadRequestException if starting a conversation with self", async () => {
      await expect(
        service.getOrCreateConversation("userA", "userA")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if one or both users do not exist", async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([{ id: "userA" }]); // only one user found

      await expect(
        service.getOrCreateConversation("userA", "userB")
      ).rejects.toThrow(NotFoundException);
    });

    it("should return the conversation if it already exists", async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([
        { id: "userA" },
        { id: "userB" },
      ]);
      mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
        id: "conv123",
        userAId: "userA",
        userBId: "userB",
        isDeletedA: false,
        isDeletedB: false,
      });

      const result = await service.getOrCreateConversation("userA", "userB");
      expect(result).toEqual({
        id: "conv123",
        userAId: "userA",
        userBId: "userB",
        isDeletedA: false,
        isDeletedB: false,
      });
      expect(mockPrismaService.conversation.findUnique).toHaveBeenCalled();
    });
  });
});
