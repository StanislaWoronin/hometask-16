import { Injectable } from '@nestjs/common';
import { QueryParametersDto } from '../../../../global-model/query-parameters.dto';
import { BlogDBModel } from './entity/blog-db.model';
import { Blog, BlogDocument, BlogSchema } from './entity/blog.schema';
import { giveSkipNumber } from '../../../../helper.functions';
import { IBlogsRepository } from './blogs-repository.interface';
import { BlogDto } from '../../../blogger/api/dto/blog.dto';
import { BanStatusModel } from '../../../../global-model/ban-status.model';
import { BindBlogDto } from '../../../super-admin/api/dto/bind-blog.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BlogsRepository implements IBlogsRepository {
  constructor(
    @InjectModel(Blog.name) private blogsRepository: Model<BlogDocument>,
  ) {}

  async getBlogs(
    query: QueryParametersDto,
    userId?: string,
  ): Promise<BlogDBModel[]> {
    const filter = this.userIdFilter(userId);

    return this.blogsRepository
      .find(
        {
          $and: [
            filter,
            { name: { $regex: query.searchNameTerm, $options: 'i' } },
            { isBanned: false },
          ],
        },
        { _id: false, isBanned: false, __v: false },
      )
      .sort({ [query.sortBy]: query.sortDirection === 'asc' ? 1 : -1 })
      .skip(giveSkipNumber(query.pageNumber, query.pageSize))
      .limit(query.pageSize)
      .lean();
  }

  async getTotalCount(
    searchNameTerm: string,
    userId?: string,
  ): Promise<number> {
    const filter = this.userIdFilter(userId);

    return this.blogsRepository.countDocuments({
      $and: [
        filter,
        { name: { $regex: searchNameTerm, $options: 'i' } },
        { isBanned: false },
      ],
    });
  }

  async saGetBlogs(query: QueryParametersDto): Promise<BlogDBModel[]> {
    const filter = this.banStatusFilter(query.banStatus);

    return this.blogsRepository
      .find(
        {
          $and: [
            { name: { $regex: query.searchNameTerm, $options: 'i' } },
            filter,
          ],
        },
        { _id: false, __v: false },
      )
      .sort({ [query.sortBy]: query.sortDirection === 'asc' ? 1 : -1 })
      .skip(giveSkipNumber(query.pageNumber, query.pageSize))
      .limit(query.pageSize)
      .lean();
  }

  async saGetTotalCount(
    banStatus: string,
    searchNameTerm: string,
  ): Promise<number> {
    const filter = this.banStatusFilter(banStatus);

    return this.blogsRepository.countDocuments({
      $and: [{ name: { $regex: searchNameTerm, $options: 'i' } }, filter],
    });
  }

  async getBlogById(id: string): Promise<BlogDBModel | null> {
    return this.blogsRepository.findOne(
      { $and: [{ id }, { isBanned: false }] },
      { _id: false, __v: false },
    );
  }

  async createBlog(newBlog: BlogDBModel): Promise<BlogDBModel | null> {
    try {
      await this.blogsRepository.create(newBlog);
      return newBlog;
    } catch (e) {
      return null;
    }
  }

  async bindBlog(params: BindBlogDto): Promise<boolean> {
    const result = await this.blogsRepository.updateOne(
      { id: params.id },
      { $set: { userId: params.userId } },
    );

    return result.matchedCount === 1;
  }

  async updateBlog(id: string, inputModel: BlogDto): Promise<boolean> {
    const result = await this.blogsRepository.updateOne(
      { id },
      {
        $set: {
          name: inputModel.name,
          description: inputModel.description,
          websiteUrl: inputModel.websiteUrl,
        },
      },
    );

    return result.matchedCount === 1;
  }

  async updateBanStatus(id: string, isBanned: boolean): Promise<boolean> {
    const result = await this.blogsRepository.updateOne(
      { $or: [{ id }, { userId: id }] },
      { $set: { isBanned } },
    );

    return result.matchedCount === 1;
  }

  async deleteBlog(blogId: string): Promise<boolean> {
    const result = await this.blogsRepository.deleteOne({ id: blogId });

    return result.deletedCount === 1;
  }

  private userIdFilter(userId: string | null) {
    let filter = {};
    if (userId) {
      filter = { userId };
    }

    return filter;
  }

  private banStatusFilter(banStatus: string | null) {
    let filter = {};
    if (banStatus === BanStatusModel.Banned) {
      filter = { isBanned: true };
    } else if (banStatus === BanStatusModel.NotBanned) {
      filter = { isBanned: false };
    }

    return filter;
  }
}
