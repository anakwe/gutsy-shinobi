#import <ScreenSaver/ScreenSaver.h>
#import <WebKit/WebKit.h>

@interface GutsyAssets : NSObject <WKURLSchemeHandler>
@end

@implementation GutsyAssets
- (void)webView:(WKWebView *)view startURLSchemeTask:(id<WKURLSchemeTask>)task {
    NSDictionary *types = @{@"/index.html": @"text/html", @"/screensaver.js": @"text/javascript",
                            @"/screensaver.css": @"text/css"};
    NSURL *url = task.request.URL;
    NSString *mime = types[url.path];
    if (![url.scheme isEqualToString:@"gutsy"] || ![url.host isEqualToString:@"saver"] ||
        !mime || url.query || url.fragment || url.port || url.user || url.password) {
        [task didFailWithError:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorNoPermissionsToReadFile userInfo:nil]];
        return;
    }
    NSURL *root = [[NSBundle bundleForClass:self.class].resourceURL URLByAppendingPathComponent:@"Web"];
    NSData *data = [NSData dataWithContentsOfURL:[root URLByAppendingPathComponent:url.lastPathComponent]];
    if (!data) {
        [task didFailWithError:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorFileDoesNotExist userInfo:nil]];
        return;
    }
    [task didReceiveResponse:[[NSURLResponse alloc] initWithURL:url MIMEType:mime expectedContentLength:data.length textEncodingName:@"utf-8"]];
    [task didReceiveData:data];
    [task didFinish];
}
- (void)webView:(WKWebView *)view stopURLSchemeTask:(id<WKURLSchemeTask>)task {}
@end

// Never become an input surface. ScreenSaverEngine owns wake and authentication.
@interface GutsyWebView : WKWebView
@end
@implementation GutsyWebView
- (NSView *)hitTest:(NSPoint)point { return nil; }
- (BOOL)acceptsFirstResponder { return NO; }
@end

@interface GutsyView : ScreenSaverView <WKNavigationDelegate, WKUIDelegate>
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic) NSUInteger generation;
@end

@implementation GutsyView
- (instancetype)initWithFrame:(NSRect)frame isPreview:(BOOL)preview {
    self = [super initWithFrame:frame isPreview:preview];
    if (self) self.animationTimeInterval = 1.0;
    return self;
}
- (void)drawRect:(NSRect)rect {
    [[NSColor blackColor] setFill];
    NSRectFill(rect);
}
- (void)startAnimation {
    [super startAnimation];
    if (self.webView) return;
    NSUInteger generation = ++self.generation;
    WKWebViewConfiguration *config = [WKWebViewConfiguration new];
    config.websiteDataStore = [WKWebsiteDataStore nonPersistentDataStore];
    config.preferences.javaScriptCanOpenWindowsAutomatically = NO;
    [config setURLSchemeHandler:[GutsyAssets new] forURLScheme:@"gutsy"];
    // Block every request except the three exact packaged resources, including
    // subresources that do not pass through the navigation delegate.
    NSMutableArray *entries = [NSMutableArray arrayWithObject:
      @{@"trigger": @{@"url-filter": @".*"}, @"action": @{@"type": @"block"}}];
    for (NSString *path in @[@"index[.]html", @"screensaver[.]js", @"screensaver[.]css"]) {
        [entries addObject:@{@"trigger": @{@"url-filter": [NSString stringWithFormat:@"^gutsy://saver/%@$", path]},
                            @"action": @{@"type": @"ignore-previous-rules"}}];
    }
    NSString *rules = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:entries options:0 error:nil]
                                          encoding:NSUTF8StringEncoding];
    __weak GutsyView *weakSelf = self;
    [[WKContentRuleListStore defaultStore] compileContentRuleListForIdentifier:@"GutsyOfflineOnly-v1"
      encodedContentRuleList:rules completionHandler:^(WKContentRuleList *list, NSError *error) {
        GutsyView *owner = weakSelf;
        if (!owner || generation != owner.generation || !owner.isAnimating || error || !list) return;
        [config.userContentController addContentRuleList:list];
        owner.webView = [[GutsyWebView alloc] initWithFrame:owner.bounds configuration:config];
        owner.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        owner.webView.navigationDelegate = owner;
        owner.webView.UIDelegate = owner;
        if (@available(macOS 13.3, *)) owner.webView.inspectable = NO;
        [owner addSubview:owner.webView];
        [owner.webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"gutsy://saver/index.html"]]];
    }];
}
- (void)stopAnimation {
    ++self.generation;
    [self.webView stopLoading];
    self.webView.navigationDelegate = nil;
    self.webView.UIDelegate = nil;
    [self.webView removeFromSuperview];
    self.webView = nil;
    [super stopAnimation];
}
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)view {
    if (self.isAnimating) [view loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"gutsy://saver/index.html"]]];
}
- (void)webView:(WKWebView *)view decidePolicyForNavigationAction:(WKNavigationAction *)action
 decisionHandler:(void (^)(WKNavigationActionPolicy))handler {
    BOOL allowed = [action.request.URL.absoluteString isEqualToString:@"gutsy://saver/index.html"] && action.targetFrame.isMainFrame;
    handler(allowed ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}
- (WKWebView *)webView:(WKWebView *)view createWebViewWithConfiguration:(WKWebViewConfiguration *)config
 forNavigationAction:(WKNavigationAction *)action windowFeatures:(WKWindowFeatures *)features { return nil; }
- (void)webView:(WKWebView *)view requestMediaCapturePermissionForOrigin:(WKSecurityOrigin *)origin
 initiatedByFrame:(WKFrameInfo *)frame type:(WKMediaCaptureType)type decisionHandler:(void (^)(WKPermissionDecision))handler {
    handler(WKPermissionDecisionDeny);
}
@end
