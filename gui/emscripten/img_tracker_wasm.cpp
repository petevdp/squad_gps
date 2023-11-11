#include <iostream>
#include <emscripten/emscripten.h>
#include <opencv2/opencv.hpp>
#include <opencv2/core.hpp>
#include <opencv2/core/types_c.h>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/calib3d/calib3d.hpp>
#include <opencv2/features2d.hpp>
#include <utility>

#include "img_tracker_wasm.hpp"

using namespace std;
using namespace cv;

#define GOOD_MATCH_RATIO    0.7f

bool initialized = false;

Ptr<SIFT> sift = SIFT::create();
Ptr<DescriptorMatcher> matcher = DescriptorMatcher::create(DescriptorMatcher::FLANNBASED);


Mat mapDescriptors;
vector<KeyPoint> mapKeypoints;

Mat H;
vector<Point2f> corners(4);
vector<Point2f> minimapBoundingBox(4);

Mat prevIm;
int numMatches = 0;
vector<Point2f> framePts;

output_t *create_output() {
    output_t *output = new output_t;
    output->data = new double[OUTPUT_SIZE];
    return output;
}

bool homographyValid(Mat H) {
    #define N 10
    const double det = H.at<double>(0,0)*H.at<double>(1,1)-H.at<double>(1,0)*H.at<double>(0,1);
    return 1/N < fabs(det) && fabs(det) < N;
}

void drawKeypointsOnCanv(vector<KeyPoint> keyPts, const char *canvasId, const char *color) {
    for (int i = 0; i < keyPts.size(); i++) {
        EM_ASM({
                   const canvasId = UTF8ToString($0);
                   const color = UTF8ToString($1);
                   const canvas = document.getElementById(canvasId);
                   const ctx = canvas.getContext("2d");
                   ctx.fillStyle = color;
                   ctx.fillRect($2, $3, 1, 1);
               }, canvasId, color, keyPts[i].pt.x, keyPts[i].pt.y);
    }
}

output_t *output = create_output();

static inline void fill_output(Mat H, bool valid) {
    cout << "filling output" << endl;
    vector<Point2f> warped(4);
    perspectiveTransform(minimapBoundingBox, warped, H);

    output->valid = valid;

    output->data[0] = H.at<double>(0, 0);
    output->data[1] = H.at<double>(0, 1);
    output->data[2] = H.at<double>(0, 2);
    output->data[3] = H.at<double>(1, 0);
    output->data[4] = H.at<double>(1, 1);
    output->data[5] = H.at<double>(1, 2);
    output->data[6] = H.at<double>(2, 0);
    output->data[7] = H.at<double>(2, 1);
    output->data[8] = H.at<double>(2, 2);

    output->data[9] = warped[0].x;
    output->data[10] = warped[0].y;
    output->data[11] = warped[1].x;
    output->data[12] = warped[1].y;
    output->data[13] = warped[2].x;
    output->data[14] = warped[2].y;
    output->data[15] = warped[3].x;
    output->data[16] = warped[3].y;
}

void print_mat(Mat mat) {
    cout << "mat type: " << mat.type() << endl;
    cout << "mat size: " << mat.size() << endl;
    cout << "mat channels: " << mat.channels() << endl;
    cout << "mat depth: " << mat.depth() << endl;
    cout << "mat dims: " << mat.dims << endl;
    cout << "mat rows: " << mat.rows << endl;
    cout << "mat cols: " << mat.cols << endl;
}

static inline void clear_output() {
    memset(output, 0, sizeof(output_t));
}

std::vector<cv::KeyPoint> parse_keypoints(
        const char *bytes,
        size_t num_bytes
) {
    struct KeyPointData {
        float x, y, size, angle, response;
        int octave, class_id;
    };

    std::vector<cv::KeyPoint> keypoints = std::vector<cv::KeyPoint>();
    for (int i = 0; i < num_bytes; i += sizeof(KeyPointData)) {
        KeyPointData kp_data = *reinterpret_cast<const KeyPointData *>(&bytes[i]);
        cv::Point2f pt(kp_data.x, kp_data.y);
        cv::KeyPoint keypoint(pt, kp_data.size, kp_data.angle, kp_data.response, kp_data.octave, kp_data.class_id);
        keypoints.push_back(keypoint);
    }

    return keypoints;
}

cv::Mat parse_descriptors(
        char *bytes,
        size_t num_bytes
) {
    int rows, cols, elemSize;
    rows = *reinterpret_cast<int *>(&bytes[0]);
    cols = *reinterpret_cast<int *>(&bytes[4]);
    elemSize = *reinterpret_cast<int *>(&bytes[8]);

    auto *data = new uchar[rows * cols * elemSize];
    for (int i = 0; i < rows * cols * elemSize; i++) {
        data[i] = bytes[12 + i];
    }
    return {rows, cols, CV_32F, data};
}

extern "C" {


EMSCRIPTEN_KEEPALIVE
int initAR(char *map_name, char *keypointsData, char *descriptorsData, size_t keypointsSize, size_t descriptorsSize) {
    cout << "initAR" << endl;
    mapKeypoints = parse_keypoints(keypointsData, keypointsSize);
    std::cout << "read keypoints for  " << map_name << std::endl;
    mapDescriptors = parse_descriptors(descriptorsData, descriptorsSize);
    std::cout << "read descriptors for  " << map_name << std::endl;
    initialized = true;
    cout << "Initialized!" << endl;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
output_t *resetTracking(char bytes, int rows, int cols, int type) {
    try {
        cout << "resetTracking" << endl;
        if (!initialized) {
            cout << "Reference image not found!" << endl;
            return NULL;
        }


        Mat frame_color = Mat(rows, cols, type, &bytes);
        // print first 10 bytes
        cout << "first 10 bytes: ";
        for (int i = 0; i < 10; i++) {
            cout << (int) frame_color.data[i] << " ";
        }
        cout << endl;


        Mat frame;
        cvtColor(frame_color, frame, COLOR_RGBA2GRAY);

        vector<KeyPoint> frame_key_pts;
        Mat frameDescriptors;
        cout << "resetTracking?afterMatCreation" << endl;
        cout << frame.size() << endl;
        sift->detectAndCompute(frame, noArray(), frame_key_pts, frameDescriptors);
        cout << "resetTracking?afterDetectAndCompute" << endl;

        const int FLANN_INDEX_KDTREE = 1;
        Ptr<cv::flann::IndexParams> index_params = new cv::flann::KDTreeIndexParams(5);
        index_params->setAlgorithm(FLANN_INDEX_KDTREE);
        Ptr<cv::flann::SearchParams> search_params = new cv::flann::SearchParams(50);
        cv::FlannBasedMatcher flann = cv::FlannBasedMatcher(index_params, search_params);
        vector<vector<DMatch>> knnMatches;
        flann.knnMatch(frameDescriptors, mapDescriptors, knnMatches, 2);

        vector<Point2f> map_inliers;
        vector<Point2f> frame_inliers;

        cout << "knnMatches.size(): " << knnMatches.size() << endl;
        // find the best matches
        for (auto &knnMatcher: knnMatches) {
            cout << "knnMatcher[0].distance(): " << knnMatcher[0].distance << endl;
            cout << "knnMatcher[1].distance(): " << knnMatcher[1].distance << endl << endl;
            if (knnMatcher[0].distance < (GOOD_MATCH_RATIO * knnMatcher[1].distance)) {
                map_inliers.push_back(mapKeypoints[knnMatcher[0].trainIdx].pt);
                frame_inliers.push_back(frame_key_pts[knnMatcher[0].queryIdx].pt);
            }
        }

        cout << "framePts.size(): " << framePts.size() << endl;
        // need at least 4 pts to define homography
        if (framePts.size() > 15) {
            cv::Mat mask;
            H = findHomography(framePts, map_inliers, RANSAC, 3, mask);
            bool valid;
            if ((valid = homographyValid(H))) {
                numMatches = framePts.size();

                // get key point inliers from current image based on mask
                vector<Point2f> inliers;
                for (int i = 0; i < mask.rows; ++i) {
                    if (mask.at<uchar>(i, 0)) {
                        inliers.push_back(framePts[i]);
                    }
                }
                Rect boundingBox = boundingRect(inliers);
                minimapBoundingBox[0] = cvPoint(boundingBox.x, boundingBox.y);
                minimapBoundingBox[1] = cvPoint(boundingBox.x + boundingBox.width, boundingBox.y);
                minimapBoundingBox[2] = cvPoint(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height);
                minimapBoundingBox[3] = cvPoint(boundingBox.x, boundingBox.y + boundingBox.height);

                fill_output(H, valid);
                prevIm = frame.clone();
            }
            cout << "homographyValid: " << valid << endl;
        }
        cout << "resetTracking done" << endl;
    } catch (const std::exception &ex) {
        cout << "exception: " << ex.what() << endl;
    } catch (const std::string &ex) {
        cout << "exception(str): " << ex << endl;
    } catch (...) {
        cout << "exception(...)" << endl;
    }
    return output;
}
}