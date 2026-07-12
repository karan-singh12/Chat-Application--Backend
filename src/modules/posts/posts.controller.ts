import { Controller, Get, Post, UseGuards, Req, Body, Param } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { AuthGuard } from "../../common/guards/auth.guard";

@Controller("posts")
@UseGuards(AuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @Req() req: any,
    @Body("content") content: string,
    @Body("imageUrl") imageUrl?: string
  ) {
    const userId = req.user.userId;
    const post = await this.postsService.createPost(userId, content, imageUrl);
    return {
      message: "Post created successfully",
      data: post,
    };
  }

  @Get()
  async getFeed() {
    const feed = await this.postsService.getFeed();
    return {
      message: "Feed fetched successfully",
      data: feed,
    };
  }

  @Post(":postId/like")
  async likePost(@Req() req: any, @Param("postId") postId: string) {
    const userId = req.user.userId;
    const result = await this.postsService.likePost(postId, userId);
    return {
      message: result.liked ? "Post liked" : "Post unliked",
      data: result,
    };
  }

  @Post(":postId/comment")
  async addComment(
    @Req() req: any,
    @Param("postId") postId: string,
    @Body("content") content: string
  ) {
    const userId = req.user.userId;
    const comment = await this.postsService.addComment(postId, userId, content);
    return {
      message: "Comment added successfully",
      data: comment,
    };
  }
}
