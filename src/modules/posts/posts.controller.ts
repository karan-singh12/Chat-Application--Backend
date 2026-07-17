import { Controller, Get, Post, UseGuards, Req, Body, Param } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { MESSAGES } from '../../common/constants/messages.constant';
import { CreatePostDto, AddCommentDto } from './dto/post.dto';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('posts')
@UseGuards(AuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(@Req() req: any, @Body() dto: CreatePostDto) {
    const userId = (req.user as AuthenticatedUser).userId;
    const post   = await this.postsService.createPost(userId, dto.content, dto.imageUrl);
    return { message: MESSAGES.posts.created, data: post };
  }

  @Get()
  async getFeed() {
    const feed = await this.postsService.getFeed();
    return { message: MESSAGES.posts.feedFetched, data: feed };
  }

  @Post(':postId/like')
  async likePost(@Req() req: any, @Param('postId') postId: string) {
    const userId = (req.user as AuthenticatedUser).userId;
    const result = await this.postsService.likePost(postId, userId);
    return { message: MESSAGES.posts.toggled(result.liked), data: result };
  }

  @Post(':postId/comment')
  async addComment(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: AddCommentDto,
  ) {
    const userId  = (req.user as AuthenticatedUser).userId;
    const comment = await this.postsService.addComment(postId, userId, dto.content);
    return { message: MESSAGES.posts.commentAdded, data: comment };
  }
}
