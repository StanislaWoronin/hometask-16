import { Injectable } from '@nestjs/common';
import { Comment, CommentDocument } from './entity/comments.scheme';
import { CommentBDModel } from './entity/commentDB.model';
import { QueryParametersDto } from '../../../../global-model/query-parameters.dto';
import { giveSkipNumber } from '../../../../helper.functions';
import { ICommentsRepository } from './comments-repository.interface';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class CommentsRepository implements ICommentsRepository {
  constructor(
    @InjectModel(Comment.name)
    private commentsRepository: Model<CommentDocument>,
  ) {}

  async getComments(
    query: QueryParametersDto,
    id: string,
  ): Promise<CommentBDModel[]> {
    return this.commentsRepository
      .find(
        {
          $or: [{ postId: id }, { userId: id }, { bloggerId: id }],
        },
        { _id: false, __v: false },
      )
      .sort({ [query.sortBy]: query.sortDirection === 'asc' ? 1 : -1 })
      .skip(giveSkipNumber(query.pageNumber, query.pageSize))
      .limit(query.pageSize)
      .lean();
  }

  async getTotalCount(id: string): Promise<number> {
    return this.commentsRepository.countDocuments({
      $or: [{ postId: id }, { userId: id }, { bloggerId: id }],
    });
  }

  async getCommentById(commentId: string): Promise<CommentBDModel | null> {
    const comment = await this.commentsRepository.findOne(
      { id: commentId },
      { projection: { _id: false, postId: false, __v: false } },
    );

    if (!comment) {
      return null;
    }

    return comment;
  }

  async createComment(
    newComment: CommentBDModel,
  ): Promise<CommentBDModel | null> {
    try {
      await this.commentsRepository.create(newComment);
      return newComment;
    } catch (e) {
      return null;
    }
  }

  async updateComment(commentId: string, comment: string): Promise<boolean> {
    const result = await this.commentsRepository.updateOne(
      { id: commentId },
      { $set: { content: comment } },
    );

    return result.modifiedCount === 1;
  }

  async deleteCommentById(commentId: string): Promise<boolean> {
    const result = await this.commentsRepository.deleteOne({ id: commentId });

    return result.deletedCount === 1;
  }
}
